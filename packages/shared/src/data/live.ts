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
import {
  fetchDeskToday,
  fetchJobs,
  fetchPlaces,
  fetchProfiles,
  fetchVehicles,
  toDispatcher,
  toDriver,
  toJob,
} from './repo';
import type { DispatcherProfile, DriverProfile, JobRequest, SavedPlace, Vehicle } from '../types';

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
  /** Pickup and drop-off points the Office serves. */
  places: SavedPlace[];
  dispatcher: DispatcherProfile;
  stats: DeskStats;
  /** Seconds each queued job has been waiting, derived from created_at. */
  waits: Record<string, number>;
  /** Desk figures derived from today's job_events. */
  deskToday: { returned: number; avgAssignSeconds: number };
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

const EMPTY_DESK = { returned: 0, avgAssignSeconds: 0 };

let state: AppState = {
  jobs: [],
  drivers: [],
  vehicles: [],
  places: [],
  dispatcher: OFFICE_FALLBACK,
  stats: EMPTY_STATS,
  waits: {},
  deskToday: EMPTY_DESK,
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
      // Both figures now come from the job_events timeline, which is written on
      // every transition. They were 0 while nothing recorded events — reported
      // as zero rather than invented, and now they are real.
      avgAssignSeconds: merged.deskToday.avgAssignSeconds,
      assignedToday: merged.jobs.filter((j) => today(j) && j.assignedDriverId).length,
      returnedToday: merged.deskToday.returned,
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

export interface RecentPlace {
  address: string;
  route?: { distanceKm: number; durationMin: number };
  lastUsedAt: string;
}

/**
 * Destinations this customer has been to before, most recent first, one entry
 * per address. Replaces a hardcoded list that showed the same three places to
 * everyone, including a brand new account.
 */
export function recentDestinations(limit = 3): RecentPlace[] {
  const seen = new Map<string, RecentPlace>();
  for (const j of [...state.jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )) {
    if (j.status === 'cancelled') continue;
    const address = j.dropoff.address;
    if (!address || seen.has(address)) continue;
    seen.set(address, { address, route: j.route, lastUsedAt: j.createdAt });
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

export interface DayEarnings {
  earned: number;
  trips: number;
  /** Completed trips grouped by part of day, newest part last. */
  ledger: Array<{ period: string; trips: number; earned: number }>;
}

// Day parts used to break the ledger up. Boundaries are local hours.
const DAY_PARTS: Array<{ period: string; from: number; to: number }> = [
  { period: 'Morning peak', from: 5, to: 11 },
  { period: 'Midday', from: 11, to: 16 },
  { period: 'Evening', from: 16, to: 22 },
  { period: 'Night', from: 22, to: 5 },
];

/**
 * What this driver has actually earned today, from their own completed jobs.
 * Replaces a hardcoded figure that was identical for every driver.
 *
 * Counts the locked total including any tip, because that is what the driver
 * is owed. Commission is not modelled anywhere yet — when it is, it belongs
 * here and NOT in the display layer.
 */
export function earningsToday(driverId: string | undefined): DayEarnings {
  const empty: DayEarnings = { earned: 0, trips: 0, ledger: [] };
  if (!driverId) return empty;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const mine = state.jobs.filter(
    (j) =>
      j.assignedDriverId === driverId &&
      j.status === 'completed' &&
      new Date(j.updatedAt).getTime() >= start.getTime(),
  );

  const buckets = new Map<string, { trips: number; earned: number }>();
  let earned = 0;
  for (const j of mine) {
    const total = j.quotedFare.total;
    earned += total;
    const hour = new Date(j.updatedAt).getHours();
    const part =
      DAY_PARTS.find((p) => (p.from < p.to ? hour >= p.from && hour < p.to : hour >= p.from || hour < p.to))
        ?.period ?? 'Other';
    const b = buckets.get(part) ?? { trips: 0, earned: 0 };
    b.trips += 1;
    b.earned += total;
    buckets.set(part, b);
  }

  return {
    earned: Math.round(earned * 100) / 100,
    trips: mine.length,
    ledger: DAY_PARTS.filter((p) => buckets.has(p.period)).map((p) => ({
      period: p.period,
      trips: buckets.get(p.period)!.trips,
      earned: Math.round(buckets.get(p.period)!.earned * 100) / 100,
    })),
  };
}

/** Full reload of everything this user is allowed to see. */
export async function hydrate(): Promise<void> {
  try {
    const [jobs, profiles, vehicles, places, deskToday] = await Promise.all([
      fetchJobs(),
      fetchProfiles(),
      fetchVehicles(),
      fetchPlaces(),
      fetchDeskToday(),
    ]);
    // The DB holds driver<->vehicle on vehicles.driver_id, so the link is
    // attached here rather than read off the profile row.
    const drivers = profiles
      .filter((p) => p.role === 'driver')
      .map(toDriver)
      .map((d) => ({ ...d, vehicleId: vehicles.find((v) => v.driverId === d.id)?.id }));
    const dispatcherRow = profiles.find((p) => p.role === 'dispatcher');
    commit({
      jobs,
      drivers,
      vehicles,
      places,
      dispatcher: dispatcherRow ? toDispatcher(dispatcherRow) : OFFICE_FALLBACK,
      deskToday,
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

  // Assignment can make people visible who weren't before: RLS lets a rider
  // read their driver and their dispatcher only once a job links them. That is
  // a JOB change, so no profiles event fires — without this refetch, the app
  // would show "the Office" instead of "Ravi K." until a restart (audit
  // finding, 2026-08-14).
  const unknownDispatcher = incoming.dispatcherId && state.dispatcher.id !== incoming.dispatcherId;
  const unknownDriver =
    incoming.assignedDriverId && !state.drivers.some((d) => d.id === incoming.assignedDriverId);
  if (unknownDispatcher || unknownDriver) void hydrate();
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
    places: [],
    dispatcher: OFFICE_FALLBACK,
    stats: EMPTY_STATS,
    waits: {},
    deskToday: EMPTY_DESK,
    sync: { status: 'loading' },
  };
  emit();
}
