// Trip summary — details again: what was earned, the trip line, and the
// running day total on a glass card. "Back to jobs" keeps the driver online.

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { earningsToday, formatDistance, formatDuration, formatMoney } from '@safeco/shared';
import { useAuth } from '@safeco/shared/auth';
import { borders, colors, spacing } from '@safeco/shared/lumina';
import { useAppState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

export function TripSummaryScreen({ navigation, route }: ScreenProps<'TripSummary'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const day = useAppState(() => earningsToday(profile?.id));

  if (!job) return <ScreenContainer />;

  // Real totals from this driver's completed jobs — the trip just finished is
  // already among them. Was a fixed baseline plus one.
  const earned = job.quotedFare.total;

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
            {[formatDuration(job.route), formatDistance(job.route), job.dropoff.address]
              .filter(Boolean)
              .join(' · ')}
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
            {formatMoney(day.earned)} · {day.trips === 1 ? '1 trip' : `${day.trips} trips`}
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
