// To pickup — MAP-DOMINANT: the driver is moving, so the plate fills the
// screen and the bottom-anchored glass sheet carries exactly one line.

import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockStore } from '@safeco/shared';
import { colors, spacing } from '@safeco/shared/lumina';
import { MapPlate, useMockState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

export function ToPickupScreen({ navigation, route }: ScreenProps<'ToPickup'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const job = useMockState((s) => s.jobs.find((j) => j.id === jobId));

  if (!job) return <ScreenContainer />;

  const mapHeight = Math.max(430, winHeight - 215 - insets.bottom);

  const arrived = () => {
    mockStore.startTrip(jobId);
    navigation.replace('OnTrip', { jobId });
  };

  return (
    <ScreenContainer>
      <MapPlate
        height={mapHeight}
        car
        label={`to pickup · ${job.customerId.toLowerCase()}`}
        style={{ flex: 1 }}
      />
      {/* Bottom sheet — one line + the single action */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        }}
      >
        <GlassCard variant="elevated">
          <LuminaText token="h3">
            {job.customerId} · {job.pickup.address}
          </LuminaText>
          <LuminaText
            token="overline"
            color={colors.onSurface.muted}
            style={{ marginTop: spacing.xs }}
          >
            3 min · note: by the newsstand
          </LuminaText>
          <NeuButton title="Arrived at pickup" onPress={arrived} style={{ marginTop: spacing.md }} />
        </GlassCard>
      </View>
    </ScreenContainer>
  );
}
