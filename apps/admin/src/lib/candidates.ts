// Candidate assembly for the assign pane. Pairs each free driver with their
// vehicle and defers every tier decision to the shared assignment helpers
// (vehiclesForTier / isMismatch) so the desk rules live in one place.

import { isMismatch, vehiclesForTier } from '@safeco/shared';
import type { DriverProfile, JobRequest, MockState, TierId, Vehicle } from '@safeco/shared';

export interface Candidate {
  driver: DriverProfile;
  vehicle: Vehicle;
  etaMinutes: number; // fake ETA: 3 / 6 / 9 min by index until live telemetry lands
  mismatch: boolean;
}

const BUSY_STATUSES: JobRequest['status'][] = ['offered', 'arriving', 'on_trip'];

// A driver+vehicle pair is free when neither half is attached to a live job.
export function freeCandidates(state: MockState, job: JobRequest): Candidate[] {
  const busyDrivers = new Set<string>();
  const busyVehicles = new Set<string>();
  for (const j of state.jobs) {
    if (BUSY_STATUSES.includes(j.status)) {
      if (j.assignedDriverId) busyDrivers.add(j.assignedDriverId);
      if (j.assignedVehicleId) busyVehicles.add(j.assignedVehicleId);
    }
  }
  const pairs: Candidate[] = [];
  for (const driver of state.drivers) {
    if (!driver.online || !driver.vehicleId) continue;
    if (busyDrivers.has(driver.id) || busyVehicles.has(driver.vehicleId)) continue;
    const vehicle = state.vehicles.find((v) => v.id === driver.vehicleId);
    if (!vehicle) continue;
    pairs.push({
      driver,
      vehicle,
      etaMinutes: (pairs.length % 3) * 3 + 3,
      mismatch: isMismatch(vehicle, job),
    });
  }
  return pairs;
}

// Default assignment list: only candidates whose vehicle matches the job tier.
export function candidatesForTier(all: Candidate[], tierId: TierId): Candidate[] {
  const allowed = new Set(vehiclesForTier(all.map((c) => c.vehicle), tierId).map((v) => v.id));
  return all.filter((c) => allowed.has(c.vehicle.id));
}

export function queuedJobs(jobs: JobRequest[]): JobRequest[] {
  return jobs.filter((j) => j.status === 'at_desk' || j.status === 'waiting');
}

export function runningJobs(jobs: JobRequest[]): JobRequest[] {
  return jobs.filter((j) => j.status === 'arriving' || j.status === 'on_trip');
}
