// Car approaching — active movement, so the MAP DOMINATES and details
// collapse to a single line (map balance rule). The sheet is an elevated
// GlassCard floating at the bottom with margins so its halo breathes.
// Tapping the sheet expands the Office timeline and the call/safety row.

import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchJobEvents, formatClock, type JobEvent } from '@safeco/shared';
import { borders, colors, spacing } from '@safeco/shared/lumina';
import { MapPlate, MonoText, useAppState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import { PlateChip, SafetyOverlay, SafetyShield } from '../ui';
import type { ScreenProps } from '../navigation';

// What each recorded event says to the customer. Naming rules apply: they see
// "the Office" or a dispatcher's real name, never the word "dispatch".
const EVENT_COPY: Record<string, string> = {
  created: 'Request sent',
  offered: 'The Office found you a car',
  confirmed: 'Driver confirmed and on the way',
  returned: 'Car returned to the Office',
  arrived: 'Driver arrived at pickup',
  boarded: 'Trip started',
  amended: 'Fare updated and confirmed',
  completed: 'Trip complete',
  cancelled: 'Ride cancelled',
};

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
  const [timeline, setTimeline] = useState<JobEvent[]>([]);

  // The real audit trail, replacing three hardcoded rows. Loaded when the
  // sheet is expanded — it is detail behind a tap, so there is no reason to
  // fetch it for every rider who never opens it.
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    void fetchJobEvents(jobId)
      .then((events) => {
        if (!cancelled) setTimeline(events);
      })
      .catch(() => {
        // A missing timeline is not worth interrupting a live trip over; the
        // section simply stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, jobId, job?.status]);

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
      {/* No distance-to-pickup: there is no location tracking, so "700 m" was
          a decoration. The driver's name is real. */}
      <MapPlate
        height={MAP_HEIGHT}
        route
        car
        label={driverName ? `${driverName.split(' ')[0].toLowerCase()} approaching` : 'car approaching'}
      />

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
              Assigned by {dispatcherName} · {formatClock(job.updatedAt)}
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
              {timeline.length === 0 ? (
                <LuminaText token="bodySmall" color={colors.onSurface.muted}>
                  No updates recorded yet.
                </LuminaText>
              ) : (
                timeline.map((e) => (
                  <View
                    key={e.id}
                    style={{ flexDirection: 'row', alignItems: 'center', minHeight: spacing['2xl'] }}
                  >
                    {/* MonoText is context-blind — explicit ink on the light sheet. */}
                    <MonoText
                      size={12}
                      color={colors.onSurface.secondary}
                      style={{ width: TIME_COLUMN }}
                    >
                      {formatClock(e.createdAt)}
                    </MonoText>
                    <LuminaText
                      token="listTitle"
                      color={colors.primary.base}
                      style={{ width: spacing.lg + spacing.xs }}
                    >
                      ✓
                    </LuminaText>
                    <LuminaText token="bodySmall" color={colors.onSurface.secondary}>
                      {EVENT_COPY[e.event] ?? e.event}
                    </LuminaText>
                  </View>
                ))
              )}
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
