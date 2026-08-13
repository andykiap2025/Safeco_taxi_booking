// To pickup — MAP-DOMINANT: the driver is moving, so the plate fills the
// screen and the bottom-anchored glass sheet carries exactly one line.

import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverArrived } from '@safeco/shared';
import { colors, spacing } from '@safeco/shared/lumina';
import { MapPlate, useAppState } from '@safeco/shared/components';
import {
  GlassCard,
  InlineError,
  LuminaText,
  NeuButton,
  ScreenContainer,
} from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

export function ToPickupScreen({ navigation, route }: ScreenProps<'ToPickup'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) return <ScreenContainer />;

  const mapHeight = Math.max(430, winHeight - 215 - insets.bottom);

  // Arriving is NOT starting the trip. The driver marks that they have pulled
  // up; the rider then boards from their own app, which is what moves the job
  // to on_trip. This screen waits for that.
  const arrived = async () => {
    setError(null);
    setBusy(true);
    try {
      await driverArrived(jobId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (job?.status === 'on_trip') navigation.replace('OnTrip', { jobId });
  }, [job?.status, jobId, navigation]);

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
          {job.status === 'at_pickup' ? (
            <LuminaText
              token="body"
              color={colors.onSurface.secondary}
              style={{ marginTop: spacing.md }}
            >
              Waiting for {job.customerId} to get in.
            </LuminaText>
          ) : (
            <NeuButton
              title="Arrived at pickup"
              onPress={arrived}
              loading={busy}
              disabled={busy}
              accessibilityLabel="Arrived at pickup"
              style={{ marginTop: spacing.md }}
            />
          )}
          {error ? (
            <InlineError
              title="Could not mark your arrival"
              message={error}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </GlassCard>
      </View>
    </ScreenContainer>
  );
}
