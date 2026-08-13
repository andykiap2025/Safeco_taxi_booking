// Choose a car — deciding screen: details dominate, map is a thin strip.
// Stacked full-width tier GlassCards (confirmed layout for 2–3 tiers).
// Selection is carried by ELEVATION ONLY: selected = variant "elevated"
// (its halo + floating shadow), others = "default". No borders, no
// checkmarks, no tint change (CLAUDE.md tier-selection rule).

import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  computeQuote,
  createJob,
  currencySymbol,
  formatMoney,
  tierById,
  TIERS,
  type TierId,
} from '@safeco/shared';
import { useAuth } from '@safeco/shared/auth';
import { colors, spacing } from '@safeco/shared/lumina';
import { MapPlate } from '@safeco/shared/components';
import {
  GlassCard,
  GlassGroup,
  GlassListItem,
  InlineError,
  LuminaText,
  NeuButton,
  ScreenContainer,
} from '@safeco/shared/ui';
import { ROUTE } from '../ui';
import type { ScreenProps } from '../navigation';

const SORTED_TIERS = [...TIERS].sort((a, b) => a.sortOrder - b.sortOrder);

export function TierSelectScreen({ navigation }: ScreenProps<'TierSelect'>) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [tierId, setTierId] = useState<TierId>('go');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quote = computeQuote(ROUTE, tierId);
  const tier = tierById(tierId);

  const book = async () => {
    if (!profile) return;
    setError(null);
    setBooking(true);
    try {
      // The quote sent here is the one the customer is looking at — the
      // fare-lock promise binds to what was on screen at the moment they
      // tapped, not to a recomputation afterwards.
      const job = await createJob({
        customerId: profile.id,
        tier: tierId,
        pickup: { address: '14 Kingsway' },
        dropoff: { address: '8 Rowan St' },
        quotedFare: quote,
        noteToDriver: 'Waiting by the newsstand on the corner.',
      });
      navigation.navigate('OfficeAssigning', { jobId: job.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      <MapPlate height={120} label="14 kingsway → 8 rowan st" />

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xl }}>
          <LuminaText token="h2" style={{ flex: 1 }}>
            Choose a car
          </LuminaText>
          <LuminaText token="overline" color={colors.text.muted} shadow="soft">
            Fares fixed
          </LuminaText>
        </View>

        {SORTED_TIERS.map((t) => {
          const q = computeQuote(ROUTE, t.id);
          const selected = t.id === tierId;
          return (
            <View key={t.id} style={{ marginTop: spacing.md }}>
              <GlassCard
                variant={selected ? 'elevated' : 'default'}
                padding="lg"
                onPress={() => setTierId(t.id)}
                accessibilityLabel={`${t.name} · ${formatMoney(q.total)}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                  <LuminaText token="h3">{t.name}</LuminaText>
                  <LuminaText token="overline" color={colors.onSurface.muted} style={{ flex: 1 }}>
                    {t.seats} seats
                  </LuminaText>
                  <LuminaText token="h3">{formatMoney(q.total)}</LuminaText>
                </View>
                <LuminaText
                  token="bodySmall"
                  color={colors.onSurface.muted}
                  numberOfLines={1}
                  style={{ marginTop: spacing.xs }}
                >
                  {t.description}
                </LuminaText>
              </GlassCard>
            </View>
          );
        })}

        {/* Payment — its own group (the tier cards above stay separate cards:
            selection is carried by elevation, so they must not merge). */}
        <GlassGroup style={{ marginTop: spacing.xl }}>
          <GlassListItem
            title="Visa · 4417"
            icon={currencySymbol()}
            trailing={
              <LuminaText token="overline" color={colors.onSurface.muted}>
                Change
              </LuminaText>
            }
            last
          />
        </GlassGroup>

        {error ? (
          <InlineError
            title="Could not book your ride"
            message={error}
            style={{ marginTop: spacing.md }}
          />
        ) : null}

        <View style={{ marginTop: 'auto', paddingTop: spacing.md }}>
          <NeuButton
            title={`Book ${tier.name} · ${formatMoney(quote.total)}`}
            onPress={book}
            loading={booking}
            disabled={booking || !profile}
            accessibilityLabel={`Book ${tier.name} for ${formatMoney(quote.total)}`}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
