// React binding for the mock store (lives in the components entry so the
// package root stays free of React).

import { useSyncExternalStore } from 'react';
import { mockStore, type MockState } from '../data/mock';

export function useMockState<T>(selector: (s: MockState) => T): T {
  return useSyncExternalStore(mockStore.subscribe, () => selector(mockStore.getState()));
}
