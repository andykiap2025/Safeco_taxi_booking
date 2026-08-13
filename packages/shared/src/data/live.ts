// The live application store.
//
// Deliberately keeps the SAME state shape the mock store exposed, so screens
// keep selecting `s.jobs`, `s.drivers`, `s.vehicles`, `s.dispatcher` exactly as
// before. What changed is underneath: rows come from Supabase and stay current
// through a realtime subscription instead of a setTimeout.
//
// Scope comes from row-level security, not from filters here: a customer's
// `jobs` is their own, a driver's is the ones assigned to them, the Office's is
// all of them. One query, three correct answers.
//
// `sync` is the honest addition. The mock could never be loading and never
// failed; a network-backed store does both, and screens need to say so.

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../supabase';
import { fetchJobs, fetchProfiles, fetchVehicles, toDispatcher, toDriver, toJob } from './repo';
import type { DispatcherProfile, DriverProfile, JobRequest, Vehicle } from '../types';

export interface DeskStats {
  carsFree: number;
  waiting: number;
  avgAssignSeconds: number;
  assignedToday: number;
  returnedToday: number;
}

export type SyncStatus = 'loading' | 'ready' | 'error';

export interface AppState {
  jobs: JobRequest[];
  drivers: DriverProfile[];
  vehicles: Vehicle[];
  dispatcher: DispatcherProfile;
  stats: DeskStats;
  /** Seconds each queued job has been waiting, derived from created_at. */
  waits: Record<string, number>;
  sync: { status: SyncStatus; error?: string };
}

// Shown when no dispatcher profile is visible. CLAUDE.md: users see "the
// Office" or a real dispatcher name — never the word "dispatch".
const OFFICE_FALLBACK: DispatcherProfile = { id: '', name: 'the Office', ward: '' };

const EMPTY_STATS: DeskStats = {
  carsFree: 0,
  waiting: 0,
  avgAssignSeconds: 0,
  assignedToday: 0,
  returnedToday: 0,
};

const QUEUED: JobRequest['status'][] = ['at_desk', 'waiting'];
const ACTIVE: JobRequest['status'][] = ['offered', 'assigned', 'arriving', 'on_trip'];

let state: AppState = {
  jobs: [],
  drivers: [],
  vehicles: [],
  dispatcher: OFFICE_FALLBACK,
  stats: EMPTY_STATS,
  waits: {},
  sync: { status: 'loading' },
};

type Listener = () => void;
const listeners = new Set<Listener>();
let channel: RealtimeChannel | undefined;
let waitTimer: ReturnType<typeof setInterval> | undefined;

function emit() {
  listeners.forEach((l) => l());
}

/** Recompute everything derived from jobs/vehicles, then publish. */
function commit(next: Partial<AppState>) {
  const merged = { ...state, ...next };
  const now = Date.now();

  const waits: Record<string, number> = {};
  for (const j of merged.jobs) {
    if (QUEUED.includes(j.status)) {
      waits[j.id] = Math.max(0, Math.round((now - new Date(j.createdAt).getTime()) / 1000));
    }
  }

  const busyVehicles = new Set(
    merged.jobs.filter((j) => ACTIVE.includes(j.status)).map((j) => j.assignedVehicleId),
  );
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = (j: JobRequest) => new Date(j.createdAt).getTime() >= startOfDay.getTime();

  state = {
    ...merged,
    waits,
    stats: {
      carsFree: merged.vehicles.filter((v) => !busyVehicles.has(v.id)).length,
      waiting: merged.jobs.filter((j) => QUEUED.includes(j.status)).length,
      // avgAssignSeconds and returnedToday need the job_events timeline to be
      // truthful; they stay 0 rather than showing an invented figure.
      avgAssignSeconds: 0,
      assignedToday: merged.jobs.filter((j) => today(j) && j.assignedDriverId).length,
      returnedToday: 0,
    },
  };
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AppState {
  return state;
}

export function job(id: string): JobRequest | undefined {
  return state.jobs.find((j) => j.id === id);
}

/** Full reload of everything this user is allowed to see. */
export async function hydrate(): Promise<void> {
  try {
    const [jobs, profiles, vehicles] = await Promise.all([
      fetchJobs(),
      fetchProfiles(),
      fetchVehicles(),
    ]);
    const drivers = profiles.filter((p) => p.role === 'driver').map(toDriver);
    const dispatcherRow = profiles.find((p) => p.role === 'dispatcher');
    commit({
      jobs,
      drivers,
      vehicles,
      dispatcher: dispatcherRow ? toDispatcher(dispatcherRow) : OFFICE_FALLBACK,
      sync: { status: 'ready' },
    });
  } catch (e) {
    commit({ sync: { status: 'error', error: (e as Error).message } });
  }
}

/** Apply one realtime row change without a full refetch. */
function applyJobChange(eventType: string, row: Record<string, any> | undefined) {
  if (!row) return;
  const incoming = toJob(row);
  if (eventType === 'DELETE') {
    commit({ jobs: state.jobs.filter((j) => j.id !== incoming.id) });
    return;
  }
  const exists = state.jobs.some((j) => j.id === incoming.id);
  commit({
    jobs: exists
      ? state.jobs.map((j) => (j.id === incoming.id ? incoming : j))
      : [incoming, ...state.jobs],
  });
}

/**
 * Start live sync. Call once the user is signed in and has a profile — before
 * that, RLS returns nothing and hydration would cache an empty world.
 *
 * Requires the jobs table to be in the `supabase_realtime` publication; see
 * supabase/schema.sql. Without it, reads still work and updates simply stop
 * arriving on their own.
 */
export async function startLiveSync(): Promise<void> {
  await hydrate();

  channel?.unsubscribe();
  channel = getSupabase()
    .channel('safeco-jobs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
      applyJobChange(payload.eventType, (payload.new ?? payload.old) as Record<string, any>);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      // Profiles change rarely (a driver going online); a refetch is cheaper to
      // reason about than merging partial rows across three roles.
      void hydrate();
    })
    .subscribe();

  // Wait clocks are derived from created_at, so they only need re-deriving on
  // a tick — no server round-trip, and they cannot drift from the real age.
  clearInterval(waitTimer);
  waitTimer = setInterval(() => commit({}), 1000);
}

export function stopLiveSync(): void {
  channel?.unsubscribe();
  channel = undefined;
  clearInterval(waitTimer);
  waitTimer = undefined;
  state = {
    jobs: [],
    drivers: [],
    vehicles: [],
    dispatcher: OFFICE_FALLBACK,
    stats: EMPTY_STATS,
    waits: {},
    sync: { status: 'loading' },
  };
  emit();
}
