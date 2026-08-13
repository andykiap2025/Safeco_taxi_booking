// React binding for the live store (lives in the components entry so the
// package root stays free of React).
//
// Replaces useMockState. Same selector shape, so a screen migrates by changing
// the import — but the data behind it can now be loading, empty, or failed,
// which the mock never could. Use useSync() for that.

import { useSyncExternalStore } from 'react';
import { getState, subscribe, type AppState } from '../data/live';

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()));
}

/** Sync status for loading / error UI. */
export function useSync(): AppState['sync'] {
  return useAppState((s) => s.sync);
}

/** One job by id, plus whether the store has finished its first load — the
 *  difference between "no such job" and "not loaded yet". Screens that key off
 *  a job id need both to avoid flashing a not-found state during hydration. */
export function useJob(jobId: string) {
  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const sync = useSync();
  return { job, loading: sync.status === 'loading', error: sync.error };
}
