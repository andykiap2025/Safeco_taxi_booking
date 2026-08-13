// Trip in progress — active movement, so the MAP DOMINATES; details are a
// single line plus a short action list on a floating elevated glass sheet.
// Add-a-stop is the ONLY path that changes the locked fare: a priced
// amendment the customer confirms before anything changes (CLAUDE.md
// "Fare amendments").

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ADD_STOP_DISALLOWED_TIERS,
  amendedTotal,
  confirmAmendment,
  formatDuration,
  formatMoney,
  type TierId,
} from '@safeco/shared';
import { colors, spacing } from '@safeco/shared/lumina';
import { MapPlate, useAppState } from '@safeco/shared/components';
import {
  GlassCard,
  GlassListItem,
  GlassModal,
  InlineError,
  LuminaText,
  NeuButton,
  ScreenContainer,
} from '@safeco/shared/ui';
import { STOP_DETOUR, SafetyOverlay, ShieldIcon } from '../ui';
import type { ScreenProps } from '../navigation';

// Map-dominant: the plate takes ~460dp; the sheet overlaps its lower edge.
const MAP_HEIGHT = 460;

export function TripScreen({ navigation, route }: ScreenProps<'Trip'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const [stopOpen, setStopOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [amending, setAmending] = useState(false);
  const [amendError, setAmendError] = useState<string | null>(null);

  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));

  // The driver completed the trip — move to rating and the receipt.
  useEffect(() => {
    if (job?.status === 'completed') navigation.replace('Arrival', { jobId });
  }, [job?.status, jobId, navigation]);

  if (!job) return <ScreenContainer />;

  const addStopAllowed = !(ADD_STOP_DISALLOWED_TIERS as readonly TierId[]).includes(job.tier);
  const showAddStop = addStopAllowed && !(job.stops && job.stops.length > 0);
  const newTotal = amendedTotal(job.quotedFare, STOP_DETOUR, job.tier);

  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      <MapPlate
        height={MAP_HEIGHT}
        route
        car
        label={`en route · ${job.dropoff.address.toLowerCase()}`}
      />

      {/* Bottom sheet — floating elevated glass */}
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
          {/* A live "12 min left" needs position tracking, which does not
              exist. The quoted journey time is real, so it is shown as a
              quote rather than a countdown that would never tick. */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <LuminaText token="display" numberOfLines={1} style={{ flexShrink: 1 }}>
              {job.dropoff.address}
            </LuminaText>
          </View>
          {formatDuration(job.route) ? (
            <LuminaText
              token="body"
              color={colors.onSurface.secondary}
              style={{ marginTop: spacing.xs }}
            >
              {formatDuration(job.route)} journey as quoted
            </LuminaText>
          ) : null}
          <LuminaText
            token="overline"
            color={colors.onSurface.muted}
            style={{ marginTop: spacing.xs, marginBottom: spacing.md }}
          >
            Fare locked · {formatMoney(job.quotedFare.total)}
          </LuminaText>

          {/* "Share live trip" is gone: it opened the safety sheet and shared
              nothing. Sharing needs a trackable link, which needs location. */}
          {showAddStop ? (
            <GlassListItem
              title="Add a stop"
              subtitle="Priced before you confirm"
              icon="+"
              onPress={() => setStopOpen(true)}
            />
          ) : null}
          {/* "Quiet ride requested · On" claimed a preference that was never
              stored and never sent to the driver. Removed until ride
              preferences exist on the job. */}
          <GlassListItem
            title="Safety tools"
            icon={<ShieldIcon size={20} />}
            onPress={() => setSafetyOpen(true)}
            last
          />

          {/* No "Arrive" button. Ending a trip is the driver's action; this
              let a rider jump to rating and tipping while still moving, and
              marked nothing complete. The effect below follows the real
              status instead. */}
          <LuminaText
            token="caption"
            color={colors.onSurface.muted}
            style={{ marginTop: spacing.lg }}
          >
            Your driver ends the trip when you arrive.
          </LuminaText>
        </GlassCard>
      </View>

      {/* Add-a-stop priced amendment */}
      <GlassModal visible={stopOpen} onClose={() => setStopOpen(false)}>
        <LuminaText token="overline" color={colors.onSurface.muted}>
          Priced amendment
        </LuminaText>
        <LuminaText token="h3" style={{ marginTop: spacing.sm }}>
          Stop at Rowan St Market
        </LuminaText>
        <LuminaText token="bodySmall" color={colors.onSurface.muted} style={{ marginTop: spacing.xs }}>
          Adds 1.1 km · 4 min to the route.
        </LuminaText>
        <LuminaText token="h2" style={{ marginTop: spacing.md }}>
          New fare {formatMoney(newTotal)}{' '}
          <LuminaText token="bodySmall" color={colors.onSurface.muted}>
            (was {formatMoney(job.quotedFare.total)})
          </LuminaText>{' '}
          · fixed
        </LuminaText>
        {amendError ? (
          <InlineError
            title="Could not change the fare"
            message={amendError}
            style={{ marginTop: spacing.md }}
          />
        ) : null}

        <View style={{ marginTop: spacing.xl }}>
          <NeuButton
            title="Confirm new fare"
            loading={amending}
            disabled={amending}
            accessibilityLabel="Confirm new fare"
            onPress={async () => {
              setAmendError(null);
              setAmending(true);
              try {
                // The ONLY path that changes a locked fare, and it only runs
                // after the customer has seen this exact figure (CLAUDE.md).
                await confirmAmendment(job, { address: 'Rowan St Market' }, newTotal);
                setStopOpen(false);
              } catch (e) {
                setAmendError((e as Error).message);
              } finally {
                setAmending(false);
              }
            }}
          />
        </View>
        <NeuButton
          variant="secondary"
          title="Keep original"
          onPress={() => setStopOpen(false)}
          style={{ marginTop: spacing.md }}
        />
      </GlassModal>

      <SafetyOverlay
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        jobId={jobId}
        reporterId={job.customerId}
      />
    </ScreenContainer>
  );
}
