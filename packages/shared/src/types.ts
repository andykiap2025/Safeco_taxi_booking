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

export interface Vehicle {
  id: string;
  tier: TierId; // REQUIRED — assignment filters on this (CLAUDE.md)
  seats: number; // gates upgrade offers against party size
  make: string;
  model: string;
  colour: string;
  plate: string;
}

export interface DriverProfile {
  id: string;
  name: string;
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
