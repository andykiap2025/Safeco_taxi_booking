// Driver at the pickup — the identification moment, so details dominate:
// name, car, plate, and the rider's note. No map. Lumina Glass: driver card
// with a glass photo tile, note on its own default glass card (informational,
// italic), call/message secondaries + rose safety shield.

import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClock, startTrip } from '@safeco/shared';
import { borders, colors, radius, spacing } from '@safeco/shared/lumina';
import { useAppState } from '@safeco/shared/components';
import { GlassCard, InlineError, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
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
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const driver = useAppState((s) => s.drivers.find((d) => d.id === job?.assignedDriverId));
  const vehicle = useAppState((s) => s.vehicles.find((v) => v.id === job?.assignedVehicleId));

  if (!job) return <ScreenContainer />;

  // NOTHING on this screen falls back to invented values. It is the
  // identification moment: the rider matches this name, car and plate against
  // a vehicle at the kerb before getting in. A default plate or car colour
  // could walk someone into the wrong car.
  const name = driver?.name ?? '';
  const firstName = name.split(' ')[0];
  const rideLine = driver ? `${driver.rating.toFixed(2)} ★ · ${thousands(driver.totalRides)} rides` : '';
  const carLine = vehicle ? `${vehicle.colour} ${vehicle.make} ${vehicle.model}` : '';

  return (
    <ScreenContainer
      style={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <LuminaText token="caption" color={colors.text.muted} shadow="soft">
        Arrived · {formatClock(job.updatedAt)} · {job.pickup.address}
      </LuminaText>
      <LuminaText token="h1" style={{ marginTop: spacing.sm }}>
        {firstName ? `${firstName} is at the pickup` : 'Your driver is at the pickup'}
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
          {vehicle?.plate ? (
            <PlateChip plate={vehicle.plate} style={{ marginTop: spacing.md }} />
          ) : null}

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
        {/* Real handoffs to the dialer and SMS app. The driver's number is
            readable only while this rider shares a live job with them. Both
            hide rather than sit dead when it is not available. */}
        {driver?.phone ? (
          <>
            <NeuButton
              variant="secondary"
              title="Call"
              onPress={() => void Linking.openURL(`tel:${driver.phone}`)}
              accessibilityLabel={`Call ${firstName}`}
              style={{ flex: 1 }}
            />
            <NeuButton
              variant="secondary"
              title="Message"
              onPress={() => void Linking.openURL(`sms:${driver.phone}`)}
              accessibilityLabel={`Message ${firstName}`}
              style={{ flex: 1 }}
            />
          </>
        ) : null}
        <SafetyShield onPress={() => setSafetyOpen(true)} />
      </View>

      {error ? (
        <InlineError
          title="Could not start the trip"
          message={error}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      <View style={{ marginTop: 'auto' }}>
        <NeuButton
          title="I'm in the car"
          loading={starting}
          disabled={starting}
          accessibilityLabel="I'm in the car"
          onPress={async () => {
            setError(null);
            setStarting(true);
            try {
              await startTrip(jobId);
              navigation.replace('Trip', { jobId });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setStarting(false);
            }
          }}
        />
      </View>

      <SafetyOverlay
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        jobId={jobId}
        reporterId={job.customerId}
      />
    </ScreenContainer>
  );
}
