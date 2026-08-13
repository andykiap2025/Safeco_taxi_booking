// Driver at the pickup — the identification moment, so details dominate:
// name, car, plate, and the rider's note. No map. Lumina Glass: driver card
// with a glass photo tile, note on its own default glass card (informational,
// italic), call/message secondaries + rose safety shield.

import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockStore } from '@safeco/shared';
import { borders, colors, radius, spacing } from '@safeco/shared/lumina';
import { useMockState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import { PlateChip, SafetyOverlay, SafetyShield } from '../ui';
import type { ScreenProps } from '../navigation';

function thousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Photo placeholder: 62dp glass tile.
const PHOTO_TILE = 62;

export function DriverArrivedScreen({ navigation, route }: ScreenProps<'DriverArrived'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const [safetyOpen, setSafetyOpen] = useState(false);

  const job = useMockState((s) => s.jobs.find((j) => j.id === jobId));
  const driver = useMockState((s) => s.drivers.find((d) => d.id === job?.assignedDriverId));
  const vehicle = useMockState((s) => s.vehicles.find((v) => v.id === job?.assignedVehicleId));

  if (!job) return <ScreenContainer />;

  const name = driver?.name ?? 'Marisol A.';
  const firstName = name.split(' ')[0];
  const rideLine = driver ? `${driver.rating.toFixed(2)} ★ · ${thousands(driver.totalRides)} rides` : '';
  const carLine = vehicle ? `${vehicle.colour} ${vehicle.make} ${vehicle.model}` : 'Silver Toyota Corolla';

  return (
    <ScreenContainer
      style={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <LuminaText token="caption" color={colors.text.muted} shadow="soft">
        Arrived · 9:31 · 14 Kingsway
      </LuminaText>
      <LuminaText token="h1" style={{ marginTop: spacing.sm }}>
        {firstName} is at the pickup
      </LuminaText>

      {/* Who's picking you up — driver, car, plate and the note they were
          given are one thing, so they share one card divided by a hairline. */}
      <View style={{ marginTop: spacing.xl }}>
        <GlassCard padding="lg">
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {/* Photo placeholder — faint ink tile on the light card. */}
            <View
              style={{
                width: PHOTO_TILE,
                height: PHOTO_TILE,
                borderRadius: radius.md,
                backgroundColor: colors.surface.well,
                borderWidth: borders.glass,
                borderColor: colors.surface.border,
              }}
            />
            <View style={{ flex: 1 }}>
              <LuminaText token="h3">{name}</LuminaText>
              <LuminaText token="bodySmall" color={colors.onSurface.muted} style={{ marginTop: 2 }}>
                {rideLine}
              </LuminaText>
              <LuminaText token="bodySmall" color={colors.onSurface.secondary} style={{ marginTop: 2 }}>
                {carLine}
              </LuminaText>
            </View>
          </View>
          <PlateChip plate={vehicle?.plate ?? 'KB 41 508'} style={{ marginTop: spacing.md }} />

          {job.noteToDriver ? (
            <View
              style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTopWidth: borders.hairline,
                borderTopColor: colors.surface.separator,
              }}
            >
              <LuminaText token="overline" color={colors.onSurface.muted}>
                Note to driver
              </LuminaText>
              <LuminaText
                token="body"
                color={colors.onSurface.secondary}
                style={{ marginTop: spacing.xs, fontStyle: 'italic' }}
              >
                “{job.noteToDriver}”
              </LuminaText>
            </View>
          ) : null}
        </GlassCard>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <NeuButton variant="secondary" title="Call" onPress={() => {}} style={{ flex: 1 }} />
        <NeuButton variant="secondary" title="Message" onPress={() => {}} style={{ flex: 1 }} />
        <SafetyShield onPress={() => setSafetyOpen(true)} />
      </View>

      <View style={{ marginTop: 'auto' }}>
        <NeuButton
          title="I'm in the car"
          onPress={() => {
            mockStore.startTrip(jobId);
            navigation.replace('Trip', { jobId });
          }}
        />
      </View>

      <SafetyOverlay visible={safetyOpen} onClose={() => setSafetyOpen(false)} />
    </ScreenContainer>
  );
}
