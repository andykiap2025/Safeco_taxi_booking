// The Office is assigning — waiting/reviewing screen, details dominant; the
// map is small with a pulsing teal ring. UI copy never says "dispatch": the
// customer sees "the Office" and Ravi K. by name (CLAUDE.md naming rules).
// Simulation: after ~3s the Office offers the job to Marisol; ~2.5s later she
// confirms and we move to the map-dominant Approach screen.

import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney, mockStore } from '@safeco/shared';
import { borders, colors, radius, spacing, touchTarget } from '@safeco/shared/lumina';
import { MapPlate, useMockState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer, withOpacity } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

// Segmented progress bars: 6dp tall, teal for done segments, faint white
// (0.15) for pending.
const BAR_HEIGHT = 6;
const BAR_PENDING_ALPHA = 0.15;
// Pulsing ring geometry over the map strip.
const RING_SIZE = 64;
const PIN_SIZE = 14;

function StepRow({
  glyph,
  glyphColor,
  text,
  now,
  dim,
  last,
}: {
  glyph: string;
  glyphColor: string;
  text: string;
  now?: boolean;
  dim?: boolean;
  last?: boolean;
}) {
  // Rendered inside a GlassCard (light surface): ink text, ink separators,
  // primary.base for the teal voice (primary.light is too weak on white).
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: touchTarget - spacing.xs,
        borderBottomWidth: last ? 0 : borders.hairline,
        borderBottomColor: colors.surface.separator,
      }}
    >
      <LuminaText
        token="listTitle"
        color={dim ? colors.onSurface.disabled : glyphColor}
        style={{ width: spacing.lg + 2, textAlign: 'center' }}
      >
        {glyph}
      </LuminaText>
      <LuminaText
        token="listTitle"
        color={dim ? colors.onSurface.disabled : colors.onSurface.primary}
        style={{ flex: 1 }}
      >
        {text}
      </LuminaText>
      {now ? (
        <LuminaText token="overline" color={colors.primary.base}>
          Now
        </LuminaText>
      ) : null}
    </View>
  );
}

export function OfficeAssigningScreen({ navigation, route }: ScreenProps<'OfficeAssigning'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const job = useMockState((s) => s.jobs.find((j) => j.id === jobId));
  const dispatcherName = useMockState((s) => s.dispatcher.name);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const offer = setTimeout(() => mockStore.offerJob(jobId, 'marisol', 'kb-41-508'), 3000);
    const confirm = setTimeout(() => {
      mockStore.driverConfirm(jobId);
      navigation.replace('Approach', { jobId });
    }, 5500);
    return () => {
      clearTimeout(offer);
      clearTimeout(confirm);
    };
  }, [jobId, navigation]);

  if (!job) return <ScreenContainer />;

  const fare = formatMoney(job.quotedFare.total);
  const offered = job.status === 'offered' || job.status === 'arriving';

  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      {/* Small map with a pulsing teal ring at the pickup */}
      <View>
        <MapPlate height={160} route={false} label="14 kingsway" />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 160,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderWidth: 2,
              borderColor: colors.primary.light,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] }) }],
            }}
          />
          <View
            style={{
              width: PIN_SIZE,
              height: PIN_SIZE,
              borderRadius: PIN_SIZE / 2,
              borderWidth: 3,
              borderColor: colors.text.primary,
              backgroundColor: colors.background,
            }}
          />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <LuminaText token="caption" color={colors.text.muted} shadow="soft" style={{ marginTop: spacing.xl }}>
          Request {job.number} · Sent to the Office
        </LuminaText>
        <LuminaText token="h1" style={{ marginTop: spacing.sm }}>
          The Office is assigning your car
        </LuminaText>
        <LuminaText token="body" color={colors.text.secondary} style={{ marginTop: spacing.md }}>
          {dispatcherName} picks the nearest free driver and sends them to 14 Kingsway. Your {fare} fare
          is already locked.
        </LuminaText>

        {/* Step ledger inside a glass card */}
        <View style={{ marginTop: spacing.xl }}>
          <GlassCard padding="lg">
            <StepRow glyph="✓" glyphColor={colors.primary.base} text="Request received" />
            <StepRow
              glyph="●"
              glyphColor={colors.primary.base}
              text={`At the Office · ${dispatcherName}`}
              now={!offered}
            />
            <StepRow
              glyph="○"
              glyphColor={colors.onSurface.disabled}
              text="Driver assigned & on the way"
              now={offered}
              dim={!offered}
              last
            />
          </GlassCard>
        </View>

        {/* Segmented progress: teal done, faint white pending */}
        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xl }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: BAR_HEIGHT,
                borderRadius: radius.full,
                backgroundColor:
                  i < (offered ? 3 : 2)
                    ? colors.primary.light
                    : withOpacity(colors.text.primary, BAR_PENDING_ALPHA),
              }}
            />
          ))}
        </View>

        <View style={{ marginTop: 'auto', paddingTop: spacing.md }}>
          <NeuButton
            variant="secondary"
            title="Cancel request"
            onPress={() => {
              mockStore.cancelJob(jobId);
              navigation.popToTop();
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
