// Narrow layout: the queue as the root screen. Selecting a request navigates
// to the Assign screen; this screen stays mounted beneath it, so the wait
// clocks keep ticking. Lumina Glass: one ScreenContainer per narrow screen.

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@safeco/shared/lumina';
import { ScreenContainer } from '@safeco/shared/ui';
import { DeskHeader } from '../components/DeskHeader';
import type { QueueScreenProps } from '../navigation';
import { QueuePane } from '../panes/QueuePane';

export function QueueScreen({ navigation }: QueueScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      <DeskHeader style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }} />
      <QueuePane onSelectJob={(jobId) => navigation.navigate('Assign', { jobId })} />
    </ScreenContainer>
  );
}
