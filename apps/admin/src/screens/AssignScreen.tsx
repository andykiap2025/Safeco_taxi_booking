// Narrow layout: assigning one request, pushed over the queue. Hold (or the
// driver confirming) pops back to the queue. Lumina Glass: one ScreenContainer
// per narrow screen.

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@safeco/shared/ui';
import type { AssignScreenProps } from '../navigation';
import { AssignPane } from '../panes/AssignPane';

export function AssignScreen({ navigation, route }: AssignScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenContainer style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <AssignPane
        jobId={route.params.jobId}
        onClose={() => {
          if (navigation.canGoBack()) navigation.goBack();
        }}
      />
    </ScreenContainer>
  );
}
