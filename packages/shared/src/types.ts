// Shared domain types. The job lifecycle and fare rules mirror the decisions
// in CLAUDE.md — change them there first.

import { TIERS } from './constants';

export type TierId = (typeof TIERS)[number]['id'];
export type Tier = (typeof TIERS)[number];

export type JobStatus =
  | 'requested' // customer submitted; not yet visible to a dispatcher
  | 'at_desk' // in the queue, a dispatcher can act on it
  | 'waiting' // still unassigned past the wait flag threshold
  | 'offered' // sent to a driver; confirm window running
  | 'assigned' // driver confirmed
  | 'arriving' // driver en route to pickup
  | 'at_pickup' // driver has arrived and is waiting for the rider to board
  | 'on_trip'
  | 'completed'
  | 'cancelled'
  | 'returned'; // driver declined or timed out — back to the queue

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place {
  address: string;
  location?: LatLng;
}

/** A pickup/drop-off point the Office serves, chosen by riders at booking. */
export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  ward?: string;
  location?: LatLng;
}

// A locked quote. Every charge must trace to one of these that the customer
// saw and accepted.
export interface FareBreakdown {
  base: number;
  distance: number;
  time: number;
  cityLevy: number;
  tip?: number;
  total: number;
  currency: string;
}

// Add-stop priced amendment: the ONLY path that changes a locked fare.
export interface FareAmendment {
  stop: Place;
  previousTotal: number;
  newTotal: number;
  confirmedAt: string; // ISO timestamp of the customer's explicit confirm
}

export interface JobRequest {
  id: string;
  number: number; // human-facing sequential request number
  customerId: string;
  tier: TierId;
  pickup: Place;
  dropoff: Place;
  stops?: Place[];
  noteToDriver?: string;
  /** The route the quote was computed from. Stored, not re-derived: the
   *  receipt itemises distance and time as charge lines, so they must be the
   *  exact figures the fare was built from. */
  route?: { distanceKm: number; durationMin: number };
  quotedFare: FareBreakdown; // locked at booking
  amendments?: FareAmendment[];
  status: JobStatus;
  partySize?: number; // absent → capacity proxy: requested tier's seat count
  assignedDriverId?: string;
  assignedVehicleId?: string;
  dispatcherId?: string; // who assigned it — surfaced to the customer by name
  upgradeApplied?: boolean; // upgrade-at-quote used; must be logged for cost review
  createdAt: string;
  updatedAt: string;
}

/** One entry in a job's audit timeline — surfaced to the customer as
 *  "9:29 · Ravi K. assigned Marisol". Written on every state transition. */
export interface JobEvent {
  id: string;
  jobId: string;
  actorId?: string;
  /** created | offered | confirmed | returned | arrived | boarded | completed
   *  | cancelled | amended */
  event: string;
  detail?: Record<string, unknown>;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  tier: TierId; // REQUIRED — assignment filters on this (CLAUDE.md)
  seats: number; // gates upgrade offers against party size
  make: string;
  model: string;
  colour: string;
  plate: string;
  /** The driver this car belongs to. The DB holds the relationship on this
   *  side (vehicles.driver_id); DriverProfile.vehicleId is derived from it. */
  driverId?: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  /** E.164. Readable by the rider only while they share a live job (RLS
   *  shares_job_with), which is what makes the Call button possible. */
  phone?: string;
  rating: number;
  totalRides: number;
  online: boolean;
  vehicleId?: string;
}

export interface DispatcherProfile {
  id: string;
  name: string; // shown to customers ("the Office · Ravi K."), never "dispatch"
  ward: string;
  shiftStart?: string;
  shiftEnd?: string;
}
