// Driver-app local state.
//
// Identity is NOT here any more. It used to hardcode DRIVER_ID = 'marisol',
// VEHICLE_ID and the one job the simulation would offer; all three now come
// from the signed-in session and the live store. What remains is genuinely
// local: the online toggle's optimistic value, and the day's earnings
// baseline, which still has no backing table.

import { useSyncExternalStore } from 'react';

// The day ledger used to live here as fixed figures (K184.20, 11 trips) that
// every driver saw regardless of what they had actually done. It is now
// derived from their own completed jobs — see earningsToday() in
// @safeco/shared data/live.
//
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
