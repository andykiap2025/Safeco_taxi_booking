// Scheduled rides — reviewing screen, no map (map balance rule). Lumina
// Glass: tomorrow's ride is the elevated card with its badge; weekday
// repeats are jewel rows; the CTA schedules a new one.

import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { computeQuote, formatMoney } from '@safeco/shared';
import { borders, colors, spacing, touchTarget } from '@safeco/shared/lumina';
import {
  GlassBadge,
  GlassCard,
  GlassGroup,
  GlassListItem,
  LuminaText,
  NeuButton,
  ScreenContainer,
} from '@safeco/shared/ui';
import { ROUTE } from '../ui';
import type { ScreenProps } from '../navigation';

export function ScheduledScreen({ navigation }: ScreenProps<'Scheduled'>) {
  const insets = useSafeAreaInsets();
  const goFare = formatMoney(computeQuote(ROUTE, 'go').total);
  const shareFare = formatMoney(computeQuote(ROUTE, 'share').total);

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

      <LuminaText token="overline" color={colors.text.muted} shadow="soft" style={{ marginTop: spacing.xl }}>
        Tomorrow
      </LuminaText>
      <View style={{ marginTop: spacing.md }}>
        <GlassCard variant="elevated" padding="lg">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <LuminaText token="h2" style={{ flex: 1 }}>
              06:15
            </LuminaText>
            <GlassBadge tone="primary">XL · $31.00 FIXED</GlassBadge>
          </View>
          <LuminaText token="body" style={{ marginTop: spacing.sm }}>
            14 Kingsway → International, T2
          </LuminaText>
          <LuminaText token="caption" color={colors.onSurface.muted} style={{ marginTop: spacing.xs }}>
            Driver assigned 30 min before · free cancel until 05:45
          </LuminaText>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing['2xl'],
              marginTop: spacing.sm,
              borderTopWidth: borders.hairline,
              borderTopColor: colors.surface.separator,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit"
              style={{ minHeight: touchTarget, justifyContent: 'center' }}
              onPress={() => {}}
            >
              <LuminaText token="caption" color={colors.onSurface.muted}>
                EDIT
              </LuminaText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={{ minHeight: touchTarget, justifyContent: 'center' }}
              onPress={() => {}}
            >
              <LuminaText token="caption" color={colors.accent.rose}>
                CANCEL
              </LuminaText>
            </Pressable>
          </View>
        </GlassCard>
      </View>

      <GlassGroup title="Every weekday" style={{ marginTop: spacing['2xl'] }}>
        <GlassListItem title="08:20 · Studio commute" subtitle={`Mon–Fri · Go · ${goFare}`} />
        <GlassListItem title="18:45 · Home" subtitle={`Mon–Thu · Share · ${shareFare}`} last />
      </GlassGroup>

      <View style={{ marginTop: 'auto' }}>
        <NeuButton title="Schedule a ride" onPress={() => navigation.navigate('TierSelect')} />
      </View>
    </ScreenContainer>
  );
}
