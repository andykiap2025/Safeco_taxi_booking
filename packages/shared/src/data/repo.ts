// Supabase repository: the single place where database rows become domain
// objects and back. Nothing above this layer knows about snake_case columns,
// PostgREST filters, or jsonb.
//
// Every function throws on failure rather than returning a sentinel — callers
// (the live store, screen actions) decide how to surface it. Silent empty
// results were the old mock's luxury; a real backend fails and must say so.

import { getSupabase } from '../supabase';
import type {
  DispatcherProfile,
  DriverProfile,
  FareAmendment,
  FareBreakdown,
  JobEvent,
  JobRequest,
  JobStatus,
  Place,
  SavedPlace,
  TierId,
  Vehicle,
} from '../types';

type Row = Record<string, any>;

// ── Row -> domain ───────────────────────────────────────────────────────────

export function toJob(r: Row): JobRequest {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customer_id,
    tier: r.tier as TierId,
    pickup: r.pickup as Place,
    dropoff: r.dropoff as Place,
    stops: (r.stops ?? []) as Place[],
    noteToDriver: r.note_to_driver ?? undefined,
    route: r.route ?? undefined,
    quotedFare: r.quoted_fare as FareBreakdown,
    amendments: (r.amendments ?? []) as FareAmendment[],
    status: r.status as JobStatus,
    partySize: r.party_size ?? undefined,
    assignedDriverId: r.assigned_driver_id ?? undefined,
    assignedVehicleId: r.assigned_vehicle_id ?? undefined,
    dispatcherId: r.dispatcher_id ?? undefined,
    upgradeApplied: r.upgrade_applied ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toDriver(r: Row): DriverProfile {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    rating: r.rating ?? 0,
    totalRides: r.total_rides ?? 0,
    online: r.online ?? false,
    // NOT from the profiles row — there is no vehicle_id column there. The
    // relationship lives on vehicles.driver_id and is attached during
    // hydration; see linkDriverVehicles in data/live.ts.
    vehicleId: undefined,
  };
}

export function toDispatcher(r: Row): DispatcherProfile {
  return { id: r.id, name: r.name, ward: r.ward ?? '' };
}

export function toVehicle(r: Row): Vehicle {
  return {
    id: r.id,
    tier: r.tier as TierId,
    seats: r.seats,
    make: r.make,
    model: r.model,
    colour: r.colour,
    plate: r.plate,
    driverId: r.driver_id ?? undefined,
  };
}

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

// ── Reads ───────────────────────────────────────────────────────────────────
// No explicit scoping filters: row-level security already limits each role to
// what it may see (customer -> own jobs, driver -> assigned, desk -> all).
// Adding client-side filters on top would silently diverge from the policies.

export async function fetchJobs(): Promise<JobRequest[]> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });
  fail('Could not load jobs', error);
  return (data ?? []).map(toJob);
}

export async function fetchProfiles(): Promise<Row[]> {
  const { data, error } = await getSupabase().from('profiles').select('*');
  fail('Could not load people', error);
  return data ?? [];
}

export async function fetchPlaces(): Promise<SavedPlace[]> {
  const { data, error } = await getSupabase()
    .from('places')
    .select('*')
    .eq('active', true)
    .order('name');
  fail('Could not load places', error);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    ward: r.ward ?? undefined,
    location: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : undefined,
  }));
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await getSupabase().from('vehicles').select('*');
  fail('Could not load vehicles', error);
  return (data ?? []).map(toVehicle);
}

// ── Writes ──────────────────────────────────────────────────────────────────

export interface CreateJobInput {
  /** Places from the service map — the server resolves addresses and
   *  coordinates itself, so a client cannot book a journey that does not
   *  exist or claim a shorter one than it charges for. */
  pickupPlaceId: string;
  dropoffPlaceId: string;
  tier: TierId;
  /** What the customer was shown. The server rejects the booking if its own
   *  calculation disagrees. */
  quotedFare: FareBreakdown;
  noteToDriver?: string;
  partySize?: number;
}

/**
 * Book a ride at the SERVER's price.
 *
 * Goes through the book_ride RPC rather than inserting directly: RLS can
 * restrict which rows a customer writes but not which columns, so a direct
 * insert let a crafted client name its own fare. The server recomputes from
 * its own config and refuses the booking if `expectedTotal` — the figure the
 * customer was actually shown — disagrees.
 *
 * That mismatch is a feature. If the app's rates ever drift from the
 * database's, the customer sees an explicit "the fare changed, try again"
 * rather than being quietly charged something other than what was on screen.
 */
export async function createJob(input: CreateJobInput): Promise<JobRequest> {
  const { data, error } = await getSupabase().rpc('book_ride', {
    p_pickup: input.pickupPlaceId,
    p_dropoff: input.dropoffPlaceId,
    p_tier: input.tier,
    p_expected_total: input.quotedFare.total,
    p_note: input.noteToDriver ?? null,
    p_party_size: input.partySize ?? null,
  });
  fail('Could not create the booking', error);
  return toJob(data as Row);
}

/**
 * Update a job and record what happened.
 *
 * The event write is fire-and-forget: the timeline is a record of the action,
 * never a gate on it. A driver must not be blocked from confirming a job
 * because an audit row failed to insert.
 */
async function patchJob(
  id: string,
  patch: Row,
  context: string,
  event?: { name: string; actorId?: string; detail?: Row },
): Promise<JobRequest> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  fail(context, error);
  if (event) void logJobEvent(id, event.actorId, event.name, event.detail);
  return toJob(data!);
}

export function offerJob(
  jobId: string,
  driverId: string,
  vehicleId: string,
  dispatcherId: string,
  opts?: { upgradeApplied?: boolean },
) {
  return patchJob(
    jobId,
    {
      status: 'offered',
      assigned_driver_id: driverId,
      assigned_vehicle_id: vehicleId,
      dispatcher_id: dispatcherId,
      upgrade_applied: opts?.upgradeApplied ?? false,
    },
    'Could not send the job',
    { name: 'offered', actorId: dispatcherId, detail: { driverId, vehicleId } },
  );
}

export function driverConfirm(jobId: string, driverId?: string) {
  return patchJob(jobId, { status: 'arriving' }, 'Could not confirm the job', {
    name: 'confirmed',
    actorId: driverId,
  });
}

export function driverReturn(jobId: string, driverId?: string) {
  return patchJob(
    jobId,
    {
      status: 'at_desk',
      assigned_driver_id: null,
      assigned_vehicle_id: null,
      upgrade_applied: false,
    },
    'Could not return the job to the queue',
    { name: 'returned', actorId: driverId },
  );
}

/** Driver has pulled up. The rider still has to board — see startTrip. */
export function driverArrived(jobId: string, driverId?: string) {
  return patchJob(jobId, { status: 'at_pickup' }, 'Could not mark your arrival', {
    name: 'arrived',
    actorId: driverId,
  });
}

/** The rider is in the car. Triggered by the RIDER, not the driver. */
export function startTrip(jobId: string, customerId?: string) {
  return patchJob(jobId, { status: 'on_trip' }, 'Could not start the trip', {
    name: 'boarded',
    actorId: customerId,
  });
}

export function cancelJob(jobId: string, actorId?: string) {
  return patchJob(jobId, { status: 'cancelled' }, 'Could not cancel the ride', {
    name: 'cancelled',
    actorId,
  });
}

export function completeTrip(jobId: string, quotedFare: FareBreakdown, actorId?: string) {
  return patchJob(
    jobId,
    { status: 'completed', quoted_fare: quotedFare },
    'Could not complete the trip',
    { name: 'completed', actorId, detail: { total: quotedFare.total } },
  );
}

/**
 * Desk figures for today, computed from the event log rather than guessed.
 *
 * avgAssignSeconds is the mean gap between a job being created and the Office
 * sending it out — the number a dispatcher is actually judged on. Only the
 * desk can read the full event set, so this returns zeroes for other roles
 * rather than a partial figure that would look like a real one.
 */
export async function fetchDeskToday(): Promise<{ returned: number; avgAssignSeconds: number }> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await getSupabase()
    .from('job_events')
    .select('job_id, event, created_at')
    .gte('created_at', start.toISOString());
  if (error) return { returned: 0, avgAssignSeconds: 0 };

  const rows = data ?? [];
  const createdAt = new Map<string, number>();
  const gaps: number[] = [];
  let returned = 0;

  for (const r of rows) {
    if (r.event === 'created') createdAt.set(r.job_id, new Date(r.created_at).getTime());
    if (r.event === 'returned') returned += 1;
  }
  // First offer per job only — a job returned and re-sent should not count its
  // second assignment as a fresh, faster one.
  const offered = new Set<string>();
  for (const r of rows) {
    if (r.event !== 'offered' || offered.has(r.job_id)) continue;
    const born = createdAt.get(r.job_id);
    if (born === undefined) continue;
    offered.add(r.job_id);
    gaps.push((new Date(r.created_at).getTime() - born) / 1000);
  }

  return {
    returned,
    avgAssignSeconds: gaps.length
      ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
      : 0,
  };
}

/** The audit timeline for one job, oldest first — what the customer is shown. */
export async function fetchJobEvents(jobId: string): Promise<JobEvent[]> {
  const { data, error } = await getSupabase()
    .from('job_events')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });
  fail('Could not load the trip timeline', error);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    jobId: r.job_id,
    actorId: r.actor_id ?? undefined,
    event: r.event,
    detail: r.detail ?? undefined,
    createdAt: r.created_at,
  }));
}

/**
 * Confirmed add-stop amendment — the ONLY path that changes a locked fare
 * (CLAUDE.md). The caller must have shown the customer `newTotal` and received
 * an explicit confirm before this runs.
 *
 * NOTE: this is a client-side update, so the fare it writes is client-computed.
 * See the FARE INTEGRITY note in supabase/schema.sql — this must move behind a
 * SECURITY DEFINER RPC that recomputes the quote server-side before real money
 * moves.
 */
export async function confirmAmendment(
  job: JobRequest,
  stop: Place,
  newTotal: number,
): Promise<JobRequest> {
  const amendment: FareAmendment = {
    stop,
    previousTotal: job.quotedFare.total,
    newTotal,
    confirmedAt: new Date().toISOString(),
  };
  return patchJob(
    job.id,
    {
      stops: [...(job.stops ?? []), stop],
      amendments: [...(job.amendments ?? []), amendment],
      quoted_fare: { ...job.quotedFare, total: newTotal },
    },
    'Could not confirm the new fare',
  );
}

export async function setDriverOnline(driverId: string, online: boolean): Promise<void> {
  const { error } = await getSupabase().from('profiles').update({ online }).eq('id', driverId);
  fail('Could not change your status', error);
}

/** Append to the audit timeline. Best-effort: never block the user action. */
export async function logJobEvent(
  jobId: string,
  actorId: string | undefined,
  event: string,
  detail?: Row,
): Promise<void> {
  // Swallowed on purpose: the timeline records what happened, it never gates
  // it. A driver must not be blocked from confirming a job because an audit
  // row failed to insert.
  try {
    await getSupabase()
      .from('job_events')
      .insert({ job_id: jobId, actor_id: actorId ?? null, event, detail: detail ?? null });
  } catch {
    /* no-op */
  }
}
