// Driver-app local state.
//
// Identity is NOT here any more. It used to hardcode DRIVER_ID = 'marisol',
// VEHICLE_ID and the one job the simulation would offer; all three now come
// from the signed-in session and the live store. What remains is genuinely
// local: the online toggle's optimistic value, and the day's earnings
// baseline, which still has no backing table.

import { useSyncExternalStore } from 'react';

// ─── Day ledger ─────────────────────────────────────────────────────────────
// PLACEHOLDER. Earnings history needs a query over completed jobs (or a
// payouts table) before it means anything — these figures are from the design
// export and are the same for every driver. Flagged in CLAUDE.md.

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
// Held locally as well as on the profile row so the switch responds instantly;
// the write is fired alongside and the store's realtime update reconciles it.

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
  return useSyncExternalStore(subscribe, () => online, () => online);
}
