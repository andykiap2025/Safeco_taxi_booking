// Car approaching — active movement, so the MAP DOMINATES and details
// collapse to a single line (map balance rule). The sheet is an elevated
// GlassCard floating at the bottom with margins so its halo breathes.
// Tapping the sheet expands the Office timeline and the call/safety row.

import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borders, colors, spacing } from '@safeco/shared/lumina';
import { MapPlate, MonoText, useAppState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import { PlateChip, SafetyOverlay, SafetyShield } from '../ui';
import type { ScreenProps } from '../navigation';

const TIMELINE: Array<[string, string]> = [
  ['9:28', 'Request sent'],
  ['9:29', 'Ravi K. assigned Marisol'],
  ['Now', 'Car moving'],
];

// Map-dominant: the plate takes ~460dp; the sheet overlaps its lower edge.
const MAP_HEIGHT = 460;
const TIME_COLUMN = 52;

export function ApproachScreen({ navigation, route }: ScreenProps<'Approach'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const driver = useAppState((s) => s.drivers.find((d) => d.id === job?.assignedDriverId));
  const vehicle = useAppState((s) => s.vehicles.find((v) => v.id === job?.assignedVehicleId));
  const dispatcherName = useAppState((s) => s.dispatcher.name);

  // The driver has pulled up — move the rider to the identification screen,
  // which is the one moment they check the plate before getting in.
  useEffect(() => {
    if (job?.status === 'at_pickup') navigation.replace('DriverArrived', { jobId });
    if (job?.status === 'cancelled') navigation.popToTop();
  }, [job?.status, jobId, navigation]);

  if (!job) return <ScreenContainer />;

  // No invented fallbacks: a wrong driver name or car colour on this screen is
  // actively dangerous, since it is what the rider matches against the kerb.
  const driverName = driver?.name ?? '';
  const carLine = vehicle ? `${vehicle.colour} ${vehicle.model}` : '';

  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      <MapPlate height={MAP_HEIGHT} route car label="marisol approaching · 700 m" />

      {/* Bottom sheet — floating elevated glass, single line, expandable */}
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          marginTop: -spacing.xl,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
        <GlassCard variant="elevated" borderRadius="xl">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trip details"
            onPress={() => setExpanded((e) => !e)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <LuminaText token="h3" numberOfLines={1} style={{ flex: 1 }}>
                {driverName} · {carLine}
              </LuminaText>
              <PlateChip plate={vehicle?.plate ?? 'KB 41 508'} />
            </View>
            <LuminaText
              token="overline"
              color={colors.onSurface.muted}
              style={{ marginTop: spacing.sm }}
            >
              2 min · Assigned by {dispatcherName} 9:29
            </LuminaText>
          </Pressable>

          {expanded ? (
            <View
              style={{
                marginTop: spacing.md,
                borderTopWidth: borders.hairline,
                borderTopColor: colors.surface.separator,
                paddingTop: spacing.sm,
              }}
            >
              {TIMELINE.map(([time, text]) => (
                <View
                  key={time}
                  style={{ flexDirection: 'row', alignItems: 'center', minHeight: spacing['2xl'] }}
                >
                  {/* MonoText is context-blind — explicit ink on the light sheet. */}
                  <MonoText size={12} color={colors.onSurface.secondary} style={{ width: TIME_COLUMN }}>
                    {time}
                  </MonoText>
                  <LuminaText
                    token="listTitle"
                    color={colors.primary.base}
                    style={{ width: spacing.lg + spacing.xs }}
                  >
                    ✓
                  </LuminaText>
                  <LuminaText token="bodySmall" color={colors.onSurface.secondary}>
                    {text}
                  </LuminaText>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <NeuButton
                  variant="secondary"
                  title="Call Marisol"
                  onPress={() => {}}
                  style={{ flex: 1 }}
                />
                <SafetyShield onPress={() => setSafetyOpen(true)} />
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: spacing.lg }}>
            <NeuButton
              title="Driver has arrived"
              onPress={() => navigation.replace('DriverArrived', { jobId })}
            />
          </View>
        </GlassCard>
      </View>

      <SafetyOverlay visible={safetyOpen} onClose={() => setSafetyOpen(false)} />
    </ScreenContainer>
  );
}
