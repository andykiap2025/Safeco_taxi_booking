// Arrival — reviewing screen, no map. Rate, tip, and the fare promise:
// charged exactly as quoted. Rating and tip sit together on one GlassCard;
// star tiles are glass squares (selected glyph teal, unselected disabled),
// tip chips are glass tiles with a teal-tinted selected state.

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currencySymbol, formatMoney, mockStore } from '@safeco/shared';
import { borders, colors, radius, spacing, touchTarget } from '@safeco/shared/lumina';
import { useMockState } from '@safeco/shared/components';
import { GlassCard, LuminaText, NeuButton, ScreenContainer, withOpacity } from '@safeco/shared/ui';
import { GhostButton, StarIcon } from '../ui';
import type { ScreenProps } from '../navigation';

// Labels derive from the active currency so they can never drift from it.
// The AMOUNTS are still the design export's figures and want revisiting with
// the Kina tariff — K1 is a smaller gesture than $1 was.
const TIP_OPTIONS = [
  { label: `${currencySymbol()}1`, value: 1 },
  { label: `${currencySymbol()}2`, value: 2 },
  { label: `${currencySymbol()}5`, value: 5 },
  { label: 'None', value: 0 },
];

// Star tiles: 52dp light wells carved into the white card.
const STAR_TILE = 52;
// Selected tip chip: teal-tinted fill under the teal focus border (still
// reads on white — kept per the surface sweep).
const TIP_SELECTED_FILL_ALPHA = 0.25;

export function ArrivalScreen({ navigation, route }: ScreenProps<'Arrival'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState(0);

  const job = useMockState((s) => s.jobs.find((j) => j.id === jobId));
  const driver = useMockState((s) => s.drivers.find((d) => d.id === job?.assignedDriverId));

  if (!job) return <ScreenContainer />;

  const firstName = (driver?.name ?? 'Marisol A.').split(' ')[0];

  const finish = (withTip: number | undefined) => {
    mockStore.completeTrip(jobId, withTip && withTip > 0 ? withTip : undefined);
    navigation.replace('Receipt', { jobId });
  };

  return (
    <ScreenContainer
      style={{
        paddingTop: insets.top + spacing['2xl'],
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <LuminaText token="caption" color={colors.text.muted} shadow="soft">
        Trip complete · 9:41
      </LuminaText>
      <LuminaText token="h1" style={{ marginTop: spacing.sm }}>
        You're at 8 Rowan St
      </LuminaText>
      <LuminaText token="body" color={colors.text.secondary} style={{ marginTop: spacing.md }}>
        12 min, 4.2 km with {firstName}. Charged {formatMoney(job.quotedFare.total)} to Visa · 4417 —
        exactly as quoted.
      </LuminaText>

      {/* Rate + tip on one glass card */}
      <View style={{ marginTop: spacing['2xl'] }}>
        <GlassCard padding="lg">
          <LuminaText token="overline" color={colors.onSurface.muted}>
            Rate the ride
          </LuminaText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                accessibilityRole="button"
                accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                onPress={() => setRating(star)}
                style={{
                  flex: 1,
                  height: STAR_TILE,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface.well,
                  borderWidth: borders.hairline,
                  borderColor: colors.surface.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StarIcon color={star <= rating ? colors.primary.base : colors.onSurface.disabled} />
              </Pressable>
            ))}
          </View>

          <LuminaText token="overline" color={colors.onSurface.muted} style={{ marginTop: spacing.xl }}>
            Add a tip
          </LuminaText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            {TIP_OPTIONS.map((o) => {
              const selected = tip === o.value;
              return (
                <Pressable
                  key={o.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Tip ${o.label}`}
                  onPress={() => setTip(o.value)}
                  style={{
                    flex: 1,
                    height: touchTarget,
                    borderRadius: radius.md,
                    backgroundColor: selected
                      ? withOpacity(colors.primary.light, TIP_SELECTED_FILL_ALPHA)
                      : colors.surface.well,
                    borderWidth: borders.glass,
                    borderColor: selected ? colors.glass.borderFocusTeal : colors.surface.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LuminaText token="listTitle">{o.label}</LuminaText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <NeuButton title="Submit rating" onPress={() => finish(tip)} />
        {/* On the gradient — explicit muted white keeps the quiet voice. */}
        <GhostButton
          title="Skip"
          color={colors.text.muted}
          onPress={() => finish(undefined)}
          style={{ marginTop: spacing.xs }}
        />
      </View>
    </ScreenContainer>
  );
}
