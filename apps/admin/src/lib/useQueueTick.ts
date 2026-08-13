// Advance the queue wait clocks while a queue is on screen: tickWaits(1) each
// second, interval cleared on unmount. Mount once per visible queue.

import { useEffect } from 'react';
import { mockStore } from '@safeco/shared';

export function useQueueTick(): void {
  useEffect(() => {
    const id = setInterval(() => mockStore.tickWaits(1), 1000);
    return () => clearInterval(id);
  }, []);
}
