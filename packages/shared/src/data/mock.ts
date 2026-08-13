// Simulation-first backend: an in-memory store seeded with the design
// export's cast. UI code talks to this API only, so swapping in Supabase
// later is contained to this layer. No React, no React Native here.

import { computeQuote } from './fare';
import type {
  DispatcherProfile,
  DriverProfile,
  FareBreakdown,
  JobRequest,
  JobStatus,
  Place,
  TierId,
  Vehicle,
} from '../types';

export interface DeskStats {
  carsFree: number;
  waiting: number;
  avgAssignSeconds: number;
  assignedToday: number;
  returnedToday: number;
}

export interface MockState {
  jobs: JobRequest[];
  drivers: DriverProfile[];
  vehicles: Vehicle[];
  dispatcher: DispatcherProfile;
  stats: DeskStats;
  // Per-job wait clocks in seconds, keyed by job id (advanced by tickWaits).
  waits: Record<string, number>;
}

type Listener = () => void;

const now = () => new Date().toISOString();
let nextNumber = 40121;

const ROUTE_GO = { distanceKm: 4.2, durationMin: 12 };

function seedJob(
  number: number,
  customer: string,
  tier: TierId,
  pickup: string,
  dropoff: string,
  status: JobStatus,
  waitSeconds: number,
  extra?: Partial<JobRequest>,
): JobRequest {
  const quotedFare: FareBreakdown = computeQuote(ROUTE_GO, tier);
  return {
    id: `job-${number}`,
    number,
    customerId: customer,
    tier,
    pickup: { address: pickup },
    dropoff: { address: dropoff },
    quotedFare,
    status,
    createdAt: now(),
    updatedAt: now(),
    ...extra,
  };
}

function seed(): MockState {
  const jobs = [
    seedJob(40118, 'Amara O.', 'go', '14 Kingsway', '8 Rowan St', 'at_desk', 22, {
      noteToDriver: 'Waiting by the newsstand on the corner.',
    }),
    seedJob(40119, 'Tomas R.', 'xl', 'Ferry Terminal', '12 Alder Row', 'at_desk', 48),
    seedJob(40120, 'Lin H.', 'share', 'Rowan St Market', '3 Quay St', 'waiting', 94),
    seedJob(40117, 'Beatriz S.', 'xl', '51 Vane St', 'International T2', 'arriving', 0, {
      assignedDriverId: 'jonas',
      assignedVehicleId: 'kb-22-741',
      dispatcherId: 'ravi',
    }),
    seedJob(40116, 'Kofi A.', 'go', '8 Rowan St', '14 Kingsway', 'on_trip', 0, {
      assignedDriverId: 'ify',
      assignedVehicleId: 'kb-60-133',
      dispatcherId: 'ravi',
    }),
  ];
  return {
    jobs,
    drivers: [
      { id: 'marisol', name: 'Marisol A.', rating: 4.94, totalRides: 2180, online: true, vehicleId: 'kb-41-508' },
      { id: 'jonas', name: 'Jonas P.', rating: 4.88, totalRides: 1540, online: true, vehicleId: 'kb-22-741' },
      { id: 'ify', name: 'Ify N.', rating: 4.97, totalRides: 3020, online: true, vehicleId: 'kb-60-133' },
    ],
    vehicles: [
      { id: 'kb-41-508', tier: 'go', seats: 4, make: 'Toyota', model: 'Corolla', colour: 'Silver', plate: 'KB 41 508' },
      { id: 'kb-22-741', tier: 'go', seats: 4, make: 'Hyundai', model: 'i20', colour: 'White', plate: 'KB 22 741' },
      { id: 'kb-60-133', tier: 'share', seats: 2, make: 'Suzuki', model: 'Ciaz', colour: 'Grey', plate: 'KB 60 133' },
      { id: 'kb-77-002', tier: 'xl', seats: 6, make: 'Toyota', model: 'HiAce', colour: 'White', plate: 'KB 77 002' },
    ],
    dispatcher: { id: 'ravi', name: 'Ravi K.', ward: 'Kingsway ward', shiftStart: '06:00', shiftEnd: '14:00' },
    stats: { carsFree: 14, waiting: 3, avgAssignSeconds: 42, assignedToday: 128, returnedToday: 2 },
    waits: { 'job-40118': 22, 'job-40119': 48, 'job-40120': 94 },
  };
}

let state: MockState = seed();
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function patchJob(id: string, patch: Partial<JobRequest>) {
  state = {
    ...state,
    jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: now() } : j)),
  };
  emit();
}

export const mockStore = {
  getState: (): MockState => state,

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset() {
    state = seed();
    emit();
  },

  job(id: string): JobRequest | undefined {
    return state.jobs.find((j) => j.id === id);
  },

  // Customer books a ride → a new request lands at the desk.
  createJob(input: {
    customer: string;
    tier: TierId;
    pickup: Place;
    dropoff: Place;
    quotedFare: FareBreakdown;
    noteToDriver?: string;
    partySize?: number;
  }): JobRequest {
    const job: JobRequest = {
      id: `job-${nextNumber}`,
      number: nextNumber++,
      customerId: input.customer,
      tier: input.tier,
      pickup: input.pickup,
      dropoff: input.dropoff,
      quotedFare: input.quotedFare,
      noteToDriver: input.noteToDriver,
      partySize: input.partySize,
      status: 'at_desk',
      createdAt: now(),
      updatedAt: now(),
    };
    state = { ...state, jobs: [job, ...state.jobs], waits: { ...state.waits, [job.id]: 0 } };
    emit();
    return job;
  },

  // Desk sends the job to a driver+vehicle (confirm window starts).
  offerJob(jobId: string, driverId: string, vehicleId: string, opts?: { upgradeApplied?: boolean }) {
    patchJob(jobId, {
      status: 'offered',
      assignedDriverId: driverId,
      assignedVehicleId: vehicleId,
      dispatcherId: state.dispatcher.id,
      upgradeApplied: opts?.upgradeApplied,
    });
  },

  driverConfirm(jobId: string) {
    patchJob(jobId, { status: 'arriving' });
  },

  // Decline or confirm-window timeout — back to the queue.
  driverReturn(jobId: string) {
    state = { ...state, stats: { ...state.stats, returnedToday: state.stats.returnedToday + 1 } };
    patchJob(jobId, {
      status: 'at_desk',
      assignedDriverId: undefined,
      assignedVehicleId: undefined,
      upgradeApplied: undefined,
    });
  },

  startTrip(jobId: string) {
    patchJob(jobId, { status: 'on_trip' });
  },

  completeTrip(jobId: string, tip?: number) {
    const job = state.jobs.find((j) => j.id === jobId);
    if (!job) return;
    const fare = tip
      ? { ...job.quotedFare, tip, total: Math.round((job.quotedFare.total + tip) * 100) / 100 }
      : job.quotedFare;
    patchJob(jobId, { status: 'completed', quotedFare: fare });
  },

  cancelJob(jobId: string) {
    patchJob(jobId, { status: 'cancelled' });
  },

  // The ONLY path that changes a locked fare (confirmed add-stop amendment).
  confirmAmendment(jobId: string, stop: Place, newTotal: number) {
    const job = state.jobs.find((j) => j.id === jobId);
    if (!job) return;
    patchJob(jobId, {
      stops: [...(job.stops ?? []), stop],
      amendments: [
        ...(job.amendments ?? []),
        { stop, previousTotal: job.quotedFare.total, newTotal, confirmedAt: now() },
      ],
      quotedFare: { ...job.quotedFare, total: newTotal },
    });
  },

  // Advance queue wait clocks (call from a 1s interval while a queue is shown).
  tickWaits(seconds = 1) {
    const waits: Record<string, number> = {};
    for (const j of state.jobs) {
      if (j.status === 'at_desk' || j.status === 'waiting') {
        waits[j.id] = (state.waits[j.id] ?? 0) + seconds;
      }
    }
    state = { ...state, waits };
    // Flag long waiters without resetting other fields.
    state = {
      ...state,
      jobs: state.jobs.map((j) =>
        (j.status === 'at_desk' && (waits[j.id] ?? 0) > 60) ? { ...j, status: 'waiting' as JobStatus } : j,
      ),
    };
    emit();
  },
};

export type MockStore = typeof mockStore;
