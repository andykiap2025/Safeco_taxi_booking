// Job offer — DETAILS-DOMINANT. The driver is deciding, so the job card
// carries the screen and the map is only a small strip. Rose is the alert
// voice here (countdown band); the single teal action is "Confirm & navigate".

import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DRIVER_CONFIRM_WINDOW_SECONDS,
  formatMoney,
  mockStore,
  tierById,
} from '@safeco/shared';
import { borders, colors, radius, spacing } from '@safeco/shared/lumina';
import { CountdownBadge, MapPlate, useAppState } from '@safeco/shared/components';
import {
  GlassCard,
  LuminaText,
  NeuButton,
  ScreenContainer,
  withOpacity,
} from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';
import { setOnline } from '../state';

// Alert band tint — rose carries the old magenta's alert duty.
const ALERT_TINT_ALPHA = 0.12;
// Pickup ring / dropoff square glyphs on the job card.
const STOP_GLYPH = 11;
const STOP_RING_BORDER = 3;
// Map is a strip only — the driver is deciding, not moving.
const MAP_STRIP_HEIGHT = 140;

function formatJobNumber(n: number): string {
  const s = String(n);
  return s.length > 3 ? `${s.slice(0, s.length - 3)} ${s.slice(s.length - 3)}` : s;
}

export function JobOfferScreen({ navigation, route }: ScreenProps<'JobOffer'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const dispatcher = useAppState((s) => s.dispatcher);
  const [secondsLeft, setSecondsLeft] = useState(DRIVER_CONFIRM_WINDOW_SECONDS);
  const handledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Confirm window ran out — the job goes back to the Office queue.
  useEffect(() => {
    if (secondsLeft > 0 || handledRef.current) return;
    handledRef.current = true;
    mockStore.driverReturn(jobId);
    navigation.popToTop();
  }, [secondsLeft, jobId, navigation]);

  if (!job) return <ScreenContainer />;

  const decline = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    mockStore.driverReturn(jobId);
    setOnline(false);
    navigation.popToTop();
  };

  const confirm = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    mockStore.driverConfirm(jobId);
    navigation.replace('ToPickup', { jobId });
  };

  const tier = tierById(job.tier);

  return (
    <ScreenContainer>
      {/* Alert band — rose voice, edge to edge */}
      <View
        style={{
          backgroundColor: withOpacity(colors.accent.rose, ALERT_TINT_ALPHA),
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <LuminaText token="overline" color={colors.accent.rose} shadow="soft">
          Job {formatJobNumber(job.number)} · from the Office
        </LuminaText>
        <CountdownBadge secondsLeft={secondsLeft} color={colors.accent.rose} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
        <LuminaText token="h1">Pickup assigned to you</LuminaText>
        <LuminaText
          token="body"
          color={colors.text.secondary}
          shadow="soft"
          style={{ marginTop: spacing.sm }}
        >
          {dispatcher.name} at the Office sent you {job.customerId} — 3 min away.
        </LuminaText>

        {/* The job card */}
        <View style={{ marginTop: spacing.lg }}>
          <GlassCard variant="elevated">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <LuminaText token="display">{formatMoney(job.quotedFare.total)}</LuminaText>
              <LuminaText
                token="overline"
                color={colors.onSurface.muted}
                style={{ marginBottom: spacing.xs }}
              >
                {tier.name} · 4.2 km · 12 min
              </LuminaText>
            </View>

            <View
              style={{
                height: borders.hairline,
                backgroundColor: colors.surface.separator,
                marginVertical: spacing.md,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: STOP_GLYPH,
                  height: STOP_GLYPH,
                  borderRadius: radius.full,
                  borderWidth: STOP_RING_BORDER,
                  borderColor: colors.onSurface.primary,
                }}
              />
              <LuminaText token="body" style={{ flex: 1 }}>
                {job.pickup.address}
              </LuminaText>
              <LuminaText token="overline" color={colors.onSurface.muted}>
                Pickup
              </LuminaText>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <View
                style={{
                  width: STOP_GLYPH,
                  height: STOP_GLYPH,
                  backgroundColor: colors.accent.rose,
                }}
              />
              <LuminaText token="body" style={{ flex: 1 }}>
                {job.dropoff.address}
              </LuminaText>
              <LuminaText token="overline" color={colors.onSurface.muted}>
                Dropoff
              </LuminaText>
            </View>

            {job.noteToDriver ? (
              <>
                <View
                  style={{
                    height: borders.hairline,
                    backgroundColor: colors.surface.separator,
                    marginVertical: spacing.md,
                  }}
                />
                <LuminaText
                  token="body"
                  color={colors.onSurface.secondary}
                  style={{ fontStyle: 'italic' }}
                >
                  &ldquo;{job.noteToDriver}&rdquo;
                </LuminaText>
              </>
            ) : null}
          </GlassCard>
        </View>

        {/* Map is a strip only — the driver is deciding, not moving */}
        <MapPlate
          height={MAP_STRIP_HEIGHT}
          label="to pickup · 1.1 km"
          style={{
            marginTop: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: borders.hairline,
            borderColor: colors.glass.border,
          }}
        />

        {/* Decision footer */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginTop: 'auto',
            paddingTop: spacing.lg,
          }}
        >
          <NeuButton variant="secondary" title="Can't take it" onPress={decline} style={{ flex: 1 }} />
          <NeuButton title="Confirm & navigate" onPress={confirm} style={{ flex: 1.4 }} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
