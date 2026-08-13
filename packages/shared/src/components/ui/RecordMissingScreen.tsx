// LUMINA GLASS UI — RecordMissingScreen.
//
// What a screen shows when the record it was opened for is not there.
//
// Screens keyed by an id used to `return <ScreenContainer />` — a blank
// gradient with no text, no spinner and no way out. Against the mock that was
// unreachable, because the record always existed. Against a network it is the
// normal case: the store is still hydrating, the session changed, or the ride
// was cancelled from another device. A rider stranded on an empty screen
// mid-journey has no idea whether to wait or force-quit.

import { ActivityIndicator, View } from 'react-native';
import { colors, spacing } from '../../lumina';
import { InlineError } from './InlineError';
import { NeuButton } from './NeuButton';
import { ScreenContainer } from './ScreenContainer';

export interface RecordMissingScreenProps {
  /** Still hydrating — show a spinner, not a "not found" claim. */
  loading: boolean;
  /** What was being looked for: "ride", "job". */
  noun?: string;
  /** Sync error, when the store failed rather than simply not having it. */
  error?: string;
  onBack: () => void;
  backLabel?: string;
}

export function RecordMissingScreen({
  loading,
  noun = 'ride',
  error,
  onBack,
  backLabel = 'Back',
}: RecordMissingScreenProps) {
  return (
    <ScreenContainer style={{ padding: spacing.lg, justifyContent: 'center' }}>
      {loading ? (
        <View accessible accessibilityLabel="Loading">
          <ActivityIndicator color={colors.primary.light} />
        </View>
      ) : (
        <InlineError
          title={`This ${noun} isn't available`}
          message={
            error ??
            `We couldn't load this ${noun}. It may have been cancelled, or finished on another device.`
          }
          action={<NeuButton title={backLabel} onPress={onBack} accessibilityLabel={backLabel} />}
        />
      )}
    </ScreenContainer>
  );
}
