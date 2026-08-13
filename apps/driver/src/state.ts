// Driver-app local state: the online toggle (a tiny external store so Home
// and JobOffer both see it) plus the demo day's fixed identifiers and
// earnings baseline. Job/trip state itself lives in the shared mockStore.

import { useSyncExternalStore } from 'react';

// ─── Demo cast (seeded in @safeco/shared mock data) ─────────────────────────

export const OFFER_JOB_ID = 'job-40118';
export const DRIVER_ID = 'marisol';
export const VEHICLE_ID = 'kb-41-508';

// Today's ledger before the simulated job comes in.
export const DAY_BASE = { earnedToday: 184.2, tripsToday: 11 } as const;

export interface LedgerRow {
  period: string;
  trips: number;
  earned: number;
}

export const DAY_LEDGER: readonly LedgerRow[] = [
  { period: 'Morning peak', trips: 6, earned: 104.8 },
  { period: 'Midday', trips: 5, earned: 79.4 },
] as const;

// ─── Online toggle ──────────────────────────────────────────────────────────

type Listener = () => void;

let online = false;
const listeners = new Set<Listener>();

export function setOnline(next: boolean): void {
  if (online === next) return;
  online = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => online);
}
