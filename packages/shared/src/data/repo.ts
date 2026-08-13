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
  JobRequest,
  JobStatus,
  Place,
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

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await getSupabase().from('vehicles').select('*');
  fail('Could not load vehicles', error);
  return (data ?? []).map(toVehicle);
}

// ── Writes ──────────────────────────────────────────────────────────────────

export interface CreateJobInput {
  customerId: string;
  tier: TierId;
  pickup: Place;
  dropoff: Place;
  quotedFare: FareBreakdown;
  noteToDriver?: string;
  partySize?: number;
}

export async function createJob(input: CreateJobInput): Promise<JobRequest> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .insert({
      customer_id: input.customerId,
      tier: input.tier,
      pickup: input.pickup,
      dropoff: input.dropoff,
      quoted_fare: input.quotedFare,
      note_to_driver: input.noteToDriver ?? null,
      party_size: input.partySize ?? null,
      status: 'at_desk',
    })
    .select()
    .single();
  fail('Could not create the booking', error);
  return toJob(data!);
}

async function patchJob(id: string, patch: Row, context: string): Promise<JobRequest> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  fail(context, error);
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
  );
}

export function driverConfirm(jobId: string) {
  return patchJob(jobId, { status: 'arriving' }, 'Could not confirm the job');
}

export function driverReturn(jobId: string) {
  return patchJob(
    jobId,
    {
      status: 'at_desk',
      assigned_driver_id: null,
      assigned_vehicle_id: null,
      upgrade_applied: false,
    },
    'Could not return the job to the queue',
  );
}

/** Driver has pulled up. The rider still has to board — see startTrip. */
export function driverArrived(jobId: string) {
  return patchJob(jobId, { status: 'at_pickup' }, 'Could not mark your arrival');
}

/** The rider is in the car. Triggered by the RIDER, not the driver. */
export function startTrip(jobId: string) {
  return patchJob(jobId, { status: 'on_trip' }, 'Could not start the trip');
}

export function cancelJob(jobId: string) {
  return patchJob(jobId, { status: 'cancelled' }, 'Could not cancel the ride');
}

export function completeTrip(jobId: string, quotedFare: FareBreakdown) {
  return patchJob(jobId, { status: 'completed', quoted_fare: quotedFare }, 'Could not complete the trip');
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
  actorId: string,
  event: string,
  detail?: Row,
): Promise<void> {
  await getSupabase()
    .from('job_events')
    .insert({ job_id: jobId, actor_id: actorId, event, detail: detail ?? null });
}
