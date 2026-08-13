// Scheduled rides — reviewing screen, no map (map balance rule).
//
// HONEST EMPTY STATE. This screen used to show a booked airport run for
// "tomorrow 06:15" and two recurring weekday commutes, with Edit and Cancel
// buttons wired to () => {}. None of it existed: there is no scheduled-rides
// table, nothing was ever booked, and the buttons did nothing. A customer
// could have arrived at a kerb at 06:15 expecting a car.
//
// Scheduling needs its own table plus a job that promotes a scheduled ride
// into the queue at the right moment. Until that exists this screen says so,
// and offers the thing that does work.

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { colors, spacing, touchTarget } from '@safeco/shared/lumina';
import { GlassCard, LuminaText, NeuButton, ScreenContainer } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

export function ScheduledScreen({ navigation }: ScreenProps<'Scheduled'>) {
  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer
      style={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          hitSlop={spacing.sm}
          style={{
            width: touchTarget - spacing.sm,
            height: touchTarget - spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LuminaText token="h2">←</LuminaText>
        </Pressable>
        <LuminaText token="h2">Scheduled</LuminaText>
      </View>

      <View style={{ marginTop: spacing['2xl'] }}>
        <GlassCard>
          <LuminaText token="overline" color={colors.onSurface.muted}>
            Not available yet
          </LuminaText>
          <LuminaText token="body" style={{ marginTop: spacing.sm }}>
            You can't book a ride for later yet. When it's ready, you'll be able to set a pickup
            time and we'll have a car there — at a fare fixed when you book, same as always.
          </LuminaText>
          <LuminaText
            token="bodySmall"
            color={colors.onSurface.muted}
            style={{ marginTop: spacing.md }}
          >
            Riding now works as normal.
          </LuminaText>
        </GlassCard>
      </View>

      <View style={{ marginTop: 'auto' }}>
        {/* Goes to Plan, not straight to tiers: a fare needs a journey, and
            the journey is chosen there. */}
        <NeuButton
          title="Book a ride now"
          onPress={() => navigation.navigate('Plan')}
          accessibilityLabel="Book a ride now"
        />
      </View>
    </ScreenContainer>
  );
}
