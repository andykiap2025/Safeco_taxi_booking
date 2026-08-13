// On trip — MAP-DOMINANT: active movement, plate fills the screen; the
// bottom-anchored glass sheet shows only the destination and the locked fare.

import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeTrip, formatMoney } from '@safeco/shared';
import { colors, spacing } from '@safeco/shared/lumina';
import { MapPlate, useAppState, useSync } from '@safeco/shared/components';
import {
  GlassCard,
  InlineError,
  LuminaText,
  NeuButton,
  ScreenContainer,
  RecordMissingScreen,
} from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

export function OnTripScreen({ navigation, route }: ScreenProps<'OnTrip'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) {
    return (
      <RecordMissingScreen
        loading={sync.status === 'loading'}
        noun="trip"
        error={sync.error}
        onBack={() => navigation.popToTop()}
      />
    );
  }

  const mapHeight = Math.max(430, winHeight - 215 - insets.bottom);

  const complete = async () => {
    if (!job) return;
    setError(null);
    setBusy(true);
    try {
      // The locked quote is passed through unchanged — the driver completing a
      // trip must never be a path that alters the fare.
      await completeTrip(jobId, job.quotedFare);
      navigation.replace('TripSummary', { jobId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <MapPlate
        height={mapHeight}
        car
        label={`en route · ${job.dropoff.address.toLowerCase()}`}
        style={{ flex: 1 }}
      />
      {/* Bottom sheet — destination + locked fare, one action */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        }}
      >
        <GlassCard variant="elevated">
          <LuminaText token="h3">{job.dropoff.address}</LuminaText>
          <LuminaText
            token="overline"
            color={colors.onSurface.muted}
            style={{ marginTop: spacing.xs }}
          >
            Fare locked · {formatMoney(job.quotedFare.total)}
          </LuminaText>
          <NeuButton
            title="Complete trip"
            onPress={complete}
            loading={busy}
            disabled={busy}
            accessibilityLabel="Complete trip"
            style={{ marginTop: spacing.md }}
          />
          {error ? (
            <InlineError
              title="Could not complete the trip"
              message={error}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </GlassCard>
      </View>
    </ScreenContainer>
  );
}
