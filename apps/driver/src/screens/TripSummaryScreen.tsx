// Trip summary — details again: what was earned, the trip line, and the
// running day total on a glass card. "Back to jobs" keeps the driver online.

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney } from '@safeco/shared';
import { borders, colors, spacing } from '@safeco/shared/lumina';
import { useMockState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';
import { DAY_BASE } from '../state';

export function TripSummaryScreen({ navigation, route }: ScreenProps<'TripSummary'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const job = useMockState((s) => s.jobs.find((j) => j.id === jobId));

  if (!job) return <ScreenContainer />;

  const earned = job.quotedFare.total;
  const dayTotal = Math.round((DAY_BASE.earnedToday + earned) * 100) / 100;
  const dayTrips = DAY_BASE.tripsToday + 1;

  return (
    <ScreenContainer
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: insets.top + spacing['2xl'],
        paddingBottom: insets.bottom + spacing.lg,
      }}
    >
      <LuminaText token="overline" color={colors.text.muted} shadow="soft">
        Trip complete
      </LuminaText>
      <LuminaText token="h1" style={{ marginTop: spacing.sm }}>
        {formatMoney(earned)} earned
      </LuminaText>

      <View style={{ marginTop: spacing.lg }}>
        <GlassCard>
          <LuminaText token="body" color={colors.onSurface.secondary}>
            12 min · 4.2 km · {job.customerId}
          </LuminaText>
          <View
            style={{
              height: borders.hairline,
              backgroundColor: colors.surface.separator,
              marginVertical: spacing.md,
            }}
          />
          <LuminaText token="overline" color={colors.onSurface.muted}>
            Day total
          </LuminaText>
          <LuminaText token="h2" style={{ marginTop: spacing.xs }}>
            {formatMoney(dayTotal)} · {dayTrips} trips
          </LuminaText>
        </GlassCard>
      </View>

      <NeuButton
        title="Back to jobs"
        onPress={() => navigation.popToTop()}
        style={{ marginTop: 'auto' }}
      />
    </ScreenContainer>
  );
}
