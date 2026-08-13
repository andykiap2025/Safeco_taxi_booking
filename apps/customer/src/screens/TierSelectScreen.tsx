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
  estimateRoute,
  formatMoney,
  tierById,
  TIERS,
  type TierId,
} from '@safeco/shared';
import { useAuth } from '@safeco/shared/auth';
import { useAppState } from '@safeco/shared/components';
import { colors, spacing } from '@safeco/shared/lumina';
import { MapPlate } from '@safeco/shared/components';
import {
  GlassCard,
  GlassGroup,
  GlassListItem,
  InlineError,
  InsetInput,
  LuminaText,
  NeuButton,
  ScreenContainer,
} from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

const SORTED_TIERS = [...TIERS].sort((a, b) => a.sortOrder - b.sortOrder);
// Long enough for "Blue gate past the church", short enough to read at a kerb.
const NOTE_MAX = 140;

export function TierSelectScreen({ navigation, route }: ScreenProps<'TierSelect'>) {
  const { pickupId, dropoffId } = route.params;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [tierId, setTierId] = useState<TierId>('go');
  const [booking, setBooking] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pickup = useAppState((s) => s.places.find((p) => p.id === pickupId));
  const dropoff = useAppState((s) => s.places.find((p) => p.id === dropoffId));

  // The journey being priced. Undefined when either end lacks coordinates —
  // then no fare is shown at all, rather than one built on a guessed distance.
  const journey = estimateRoute(pickup?.location, dropoff?.location);
  const quote = journey ? computeQuote(journey, tierId) : undefined;
  const tier = tierById(tierId);

  const book = async () => {
    if (!profile || !quote || !journey || !pickup || !dropoff) return;
    setError(null);
    setBooking(true);
    try {
      // The quote sent here is the one the customer is looking at — the
      // fare-lock promise binds to what was on screen at the moment they
      // tapped, not to a recomputation afterwards.
      const job = await createJob({
        customerId: profile.id,
        tier: tierId,
        pickup: { address: pickup.name, location: pickup.location },
        dropoff: { address: dropoff.name, location: dropoff.location },
        // Stored with the job so the receipt can itemise the same journey the
        // fare was computed from.
        route: journey,
        quotedFare: quote,
        noteToDriver: note.trim() || undefined,
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
      <MapPlate
        height={120}
        label={`${(pickup?.name ?? '').toLowerCase()} → ${(dropoff?.name ?? '').toLowerCase()}`}
      />

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xl }}>
          <LuminaText token="h2" style={{ flex: 1 }}>
            Choose a car
          </LuminaText>
          <LuminaText token="overline" color={colors.text.muted} shadow="soft">
            Fares fixed
          </LuminaText>
        </View>

        {!journey ? (
          <InlineError
            title="No fare for this journey"
            message="We don't have map coordinates for one of these places, so we can't quote a fixed fare. Ask the Office to add them."
            style={{ marginTop: spacing.lg }}
          />
        ) : null}

        {SORTED_TIERS.map((t) => {
          const q = journey ? computeQuote(journey, t.id) : undefined;
          const selected = t.id === tierId;
          return (
            <View key={t.id} style={{ marginTop: spacing.md }}>
              <GlassCard
                variant={selected ? 'elevated' : 'default'}
                padding="lg"
                onPress={() => setTierId(t.id)}
                accessibilityLabel={q ? `${t.name} · ${formatMoney(q.total)}` : t.name}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                  <LuminaText token="h3">{t.name}</LuminaText>
                  <LuminaText token="overline" color={colors.onSurface.muted} style={{ flex: 1 }}>
                    {t.seats} seats
                  </LuminaText>
                  <LuminaText token="h3">{q ? formatMoney(q.total) : '—'}</LuminaText>
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

        {/* The note the driver is shown at pickup. Booking used to send a
            fixed "Waiting by the newsstand on the corner." on every ride —
            removed, which left riders no way to say anything at all. */}
        <View style={{ marginTop: spacing.xl }}>
          <GlassCard>
            <LuminaText token="overline" color={colors.onSurface.muted}>
              Note for your driver (optional)
            </LuminaText>
            <InsetInput
              value={note}
              onChangeText={setNote}
              placeholder="Where to find you"
              accessibilityLabel="Note for your driver"
              editable={!booking}
              maxLength={NOTE_MAX}
              style={{ marginTop: spacing.md }}
            />
          </GlassCard>
        </View>

        {/* Payment — its own group (the tier cards above stay separate cards:
            selection is carried by elevation, so they must not merge).
            No card on file: there is no payment provider, so naming one would
            be a promise the app cannot keep. */}
        <GlassGroup style={{ marginTop: spacing.xl }}>
          <GlassListItem
            title="Pay your driver directly"
            subtitle="Card payment is coming"
            icon={currencySymbol()}
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
            title={quote ? `Book ${tier.name} · ${formatMoney(quote.total)}` : 'Fare unavailable'}
            onPress={book}
            loading={booking}
            disabled={booking || !profile || !quote}
            accessibilityLabel={
              quote ? `Book ${tier.name} for ${formatMoney(quote.total)}` : 'Fare unavailable'
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
