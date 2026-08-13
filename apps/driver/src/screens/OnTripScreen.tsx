// On trip — MAP-DOMINANT: active movement, plate fills the screen; the
// bottom-anchored glass sheet shows only the destination and the locked fare.

import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney, mockStore } from '@safeco/shared';
import { colors, spacing } from '@safeco/shared/lumina';
import { MapPlate, useAppState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

export function OnTripScreen({ navigation, route }: ScreenProps<'OnTrip'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));

  if (!job) return <ScreenContainer />;

  const mapHeight = Math.max(430, winHeight - 215 - insets.bottom);

  const complete = () => {
    mockStore.completeTrip(jobId);
    navigation.replace('TripSummary', { jobId });
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
          <NeuButton title="Complete trip" onPress={complete} style={{ marginTop: spacing.md }} />
        </GlassCard>
      </View>
    </ScreenContainer>
  );
}
