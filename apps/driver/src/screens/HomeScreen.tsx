// Home — Lumina Glass: brand hero over the mesh gradient, earnings + ledger
// on glass cards, a small map strip (no active movement yet), and the online
// toggle. While online, the Office sends job 40 118 after a few seconds.

import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney, mockStore } from '@safeco/shared';
import { borders, colors, radius, shadows, spacing, typography } from '@safeco/shared/lumina';
import { BrandWordmark, MapPlate, MonoText, useAppState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';
import {
  DAY_BASE,
  DAY_LEDGER,
  DRIVER_ID,
  OFFER_JOB_ID,
  setOnline,
  useOnline,
  VEHICLE_ID,
} from '../state';

const TRIPS_COL = 56;
const EARNED_COL = 84;
// Status dot beside the ONLINE overline.
const ONLINE_DOT = spacing.sm;
// Position strip only — no active movement, so the map stays small.
const MAP_STRIP_HEIGHT = 160;

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const driver = useAppState((s) => s.drivers.find((d) => d.id === DRIVER_ID));
  const ward = useAppState((s) => s.dispatcher.ward);
  const jobStatus = useAppState((s) => s.jobs.find((j) => j.id === OFFER_JOB_ID)?.status);

  // Simulation: while online and the job is still at the desk, the Office
  // offers it to Marisol after ~4 seconds.
  useEffect(() => {
    if (!online) return;
    if (jobStatus !== 'at_desk' && jobStatus !== 'waiting') return;
    const timer = setTimeout(() => {
      const job = mockStore.job(OFFER_JOB_ID);
      if (!job || (job.status !== 'at_desk' && job.status !== 'waiting')) return;
      if (!navigation.isFocused()) return;
      mockStore.offerJob(OFFER_JOB_ID, DRIVER_ID, VEHICLE_ID);
      navigation.navigate('JobOffer', { jobId: OFFER_JOB_ID });
    }, 4000);
    return () => clearTimeout(timer);
  }, [online, jobStatus, navigation]);

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
        {/* Brand hero — the wordmark is the only serif on screen */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <BrandWordmark
            size={typography.brand.fontSize}
            color={colors.text.primary}
            style={{ ...shadows.textStrong }}
          >
            SAFECO
          </BrandWordmark>
          <LuminaText token="h3" shadow="soft">
            Driver
          </LuminaText>
        </View>
        <LuminaText
          token="bodySmall"
          color={colors.text.muted}
          shadow="soft"
          style={{ marginTop: spacing.xs }}
        >
          {driver ? driver.name : 'Marisol A.'} · {ward}
        </LuminaText>

        {/* Today's earnings and the day-part ledger are the same subject, so
            they share one card: headline figure, hairline, then the breakdown. */}
        <View style={{ marginTop: spacing.lg }}>
          <GlassCard>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <LuminaText token="display">{formatMoney(DAY_BASE.earnedToday)}</LuminaText>
                <LuminaText
                  token="caption"
                  color={colors.onSurface.muted}
                  style={{ marginTop: spacing.xs }}
                >
                  earned today
                </LuminaText>
              </View>
              <LuminaText token="bodySmall" color={colors.onSurface.muted}>
                {DAY_BASE.tripsToday} trips so far
              </LuminaText>
            </View>

            <View
              style={{
                height: borders.hairline,
                backgroundColor: colors.surface.separator,
                marginTop: spacing.lg,
                marginBottom: spacing.lg,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <LuminaText token="overline" color={colors.onSurface.muted} style={{ flex: 1 }}>
                Period
              </LuminaText>
              <LuminaText
                token="overline"
                color={colors.onSurface.muted}
                style={{ width: TRIPS_COL, textAlign: 'right' }}
              >
                Trips
              </LuminaText>
              <LuminaText
                token="overline"
                color={colors.onSurface.muted}
                style={{ width: EARNED_COL, textAlign: 'right' }}
              >
                Earned
              </LuminaText>
            </View>
            <View
              style={{
                height: borders.hairline,
                backgroundColor: colors.surface.separator,
                marginTop: spacing.sm,
              }}
            />
            {DAY_LEDGER.map((row, i) => (
              <View
                key={row.period}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderBottomWidth: i === DAY_LEDGER.length - 1 ? 0 : borders.hairline,
                  borderBottomColor: colors.surface.separator,
                }}
              >
                <LuminaText token="listTitle" style={{ flex: 1 }}>
                  {row.period}
                </LuminaText>
                <MonoText
                  style={{ width: TRIPS_COL, textAlign: 'right' }}
                  color={colors.onSurface.secondary}
                >
                  {row.trips}
                </MonoText>
                <MonoText
                  style={{ width: EARNED_COL, textAlign: 'right' }}
                  color={colors.onSurface.secondary}
                >
                  {formatMoney(row.earned)}
                </MonoText>
              </View>
            ))}
          </GlassCard>
        </View>

        {/* Position strip — no active movement, so the map stays small */}
        <MapPlate
          height={MAP_STRIP_HEIGHT}
          route={false}
          car
          label={`your position · ${ward.toLowerCase()}`}
          style={{
            marginTop: spacing.md,
            borderRadius: radius.lg,
            borderWidth: borders.hairline,
            borderColor: colors.glass.border,
          }}
        />

        {/* Online toggle — flows after the content */}
        <View style={{ marginTop: spacing['2xl'] }}>
          {online ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  marginBottom: spacing.md,
                }}
              >
                <View
                  style={{
                    width: ONLINE_DOT,
                    height: ONLINE_DOT,
                    borderRadius: radius.full,
                    backgroundColor: colors.primary.light,
                  }}
                />
                <LuminaText token="overline" color={colors.text.muted} shadow="soft">
                  Online · waiting for jobs
                </LuminaText>
              </View>
              <NeuButton variant="secondary" title="Go offline" onPress={() => setOnline(false)} />
            </>
          ) : (
            <NeuButton title="Go online" onPress={() => setOnline(true)} />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
