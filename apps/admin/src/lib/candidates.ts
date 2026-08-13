// Candidate assembly for the assign pane. Pairs each free driver with their
// vehicle and defers every tier decision to the shared assignment helpers
// (vehiclesForTier / isMismatch) so the desk rules live in one place.

import { isMismatch, vehiclesForTier } from '@safeco/shared';
import type { AppState, DriverProfile, JobRequest, TierId, Vehicle } from '@safeco/shared';

export interface Candidate {
  driver: DriverProfile;
  vehicle: Vehicle;
  etaMinutes: number; // PLACEHOLDER: 3 / 6 / 9 by index until live telemetry lands
  mismatch: boolean;
}

// Every state in which a driver is already committed to a job. 'assigned' and
// 'at_pickup' belong here: a driver waiting at a kerb for their rider to board
// is not available, and offering them a second job would double-book them.
const BUSY_STATUSES: JobRequest['status'][] = [
  'offered',
  'assigned',
  'arriving',
  'at_pickup',
  'on_trip',
];

// A driver+vehicle pair is free when neither half is attached to a live job.
export function freeCandidates(state: AppState, job: JobRequest): Candidate[] {
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
  return jobs.filter(
    (j) => j.status === 'assigned' || j.status === 'arriving' || j.status === 'at_pickup' || j.status === 'on_trip',
  );
}
