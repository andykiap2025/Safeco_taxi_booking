// Wide (≥900px) two-pane console: queue on the left, assign panel fixed on
// the right, both always visible. Selection state lives here and is handed to
// both panes; keying the assign pane by job id resets its per-job state.
// Lumina Glass: ONE ScreenContainer wraps the whole console so a single mesh
// gradient spans both panes; the pane divider is the faint separator hairline.

import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borders, colors, spacing } from '@safeco/shared/lumina';
import { LuminaText, ScreenContainer } from '@safeco/shared/ui';
import { DeskHeader } from '../components/DeskHeader';
import { AssignPane } from './AssignPane';
import { QueuePane } from './QueuePane';

// Fixed assign-pane width, unchanged from the pre-Lumina console.
const ASSIGN_PANE_WIDTH = 400;

export function WideConsole() {
  const insets = useSafeAreaInsets();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  return (
    <ScreenContainer style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <DeskHeader style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }} />
      <View style={{ flex: 1, flexDirection: 'row', marginTop: spacing.md }}>
        <View style={{ flex: 1 }}>
          <QueuePane selectedJobId={selectedJobId ?? undefined} onSelectJob={setSelectedJobId} />
        </View>
        <View
          style={{
            width: ASSIGN_PANE_WIDTH,
            borderLeftWidth: borders.hairline,
            borderLeftColor: colors.separator,
          }}
        >
          {selectedJobId ? (
            <AssignPane key={selectedJobId} jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
          ) : (
            <View
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}
            >
              <LuminaText token="overline" color={colors.text.muted} shadow="soft">
                Assign
              </LuminaText>
              <LuminaText
                color={colors.text.secondary}
                style={{ marginTop: spacing.sm, textAlign: 'center' }}
              >
                Choose a request from the queue to pick a driver and car.
              </LuminaText>
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
