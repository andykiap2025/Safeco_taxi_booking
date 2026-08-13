// Plan a ride — deciding screen, so details dominate: the map is a strip and
// the glass sheet below carries the work (map balance rule). Lumina Glass:
// pickup/destination live in one GlassCard (white origin ring, rose
// destination square), recents are jewel rows, footer pairs the secondary
// Schedule with the gradient Ride now CTA.

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatDistance,
  formatDuration,
  recentDestinations,
  type SavedPlace,
} from '@safeco/shared';
import { borders, colors, radius, spacing, touchTarget } from '@safeco/shared/lumina';
import { MapPlate, useAppState } from '@safeco/shared/components';
import {
  GlassCard,
  GlassGroup,
  GlassListItem,
  LuminaText,
  NeuButton,
  ScreenContainer,
  withOpacity,
} from '@safeco/shared/ui';
import { PlacePicker } from '../ui';
import type { ScreenProps } from '../navigation';

// Recents come from the customer's own past trips (see recentDestinations).
// This was a fixed list shown identically to everyone, including accounts that
// had never taken a ride.

// Origin ring / destination square geometry (visual glyphs, not tap targets).
const ORIGIN_RING = 16;
const DEST_SQUARE = 13;
const RECENT_SQUARE = 10;
const RECENT_SQUARE_ALPHA = 0.5;

export function PlanScreen({ navigation }: ScreenProps<'Plan'>) {
  const insets = useSafeAreaInsets();
  const places = useAppState((s) => s.places);
  const recents = useAppState(() => recentDestinations());
  const [pickup, setPickup] = useState<SavedPlace | undefined>();
  const [dropoff, setDropoff] = useState<SavedPlace | undefined>();
  const [picking, setPicking] = useState<'pickup' | 'dropoff' | null>(null);

  const ready = !!pickup && !!dropoff;
  const toTiers = () => {
    if (!ready) return;
    navigation.navigate('TierSelect', { pickupId: pickup.id, dropoffId: dropoff.id });
  };

  // Tapping a recent sets the destination; the rider still picks where they
  // are leaving from, which may not be where they last were.
  const useRecent = (address: string) => {
    const match = places.find((p) => p.address === address || p.name === address);
    if (match) setDropoff(match);
  };

  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      <MapPlate height={180} label="pickup · kingsway ward" />

      {/* Details sheet */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <LuminaText token="h2">Where to?</LuminaText>

        {/* Pickup + destination in one glass card. Both are now real choices
            from the Office's service map — this card used to state a fixed
            journey with an "Edit" that did nothing. */}
        <View style={{ marginTop: spacing.lg }}>
          <GlassCard padding="lg">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pickup ? `Pickup ${pickup.name}` : 'Choose pickup'}
              onPress={() => setPicking('pickup')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: touchTarget,
                borderBottomWidth: borders.hairline,
                borderBottomColor: colors.surface.separator,
              }}
            >
              <View
                style={{
                  width: ORIGIN_RING,
                  height: ORIGIN_RING,
                  borderRadius: radius.full,
                  borderWidth: 3,
                  borderColor: colors.onSurface.primary,
                }}
              />
              <LuminaText
                token="listTitle"
                style={{ flex: 1 }}
                color={pickup ? undefined : colors.onSurface.muted}
                numberOfLines={1}
              >
                {pickup?.name ?? 'Choose pickup'}
              </LuminaText>
              <LuminaText token="overline" color={colors.onSurface.muted}>
                {pickup ? 'Change' : ''}
              </LuminaText>
            </Pressable>

            {/* Destination — the active field: rose square glyph */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={dropoff ? `Destination ${dropoff.name}` : 'Choose destination'}
              onPress={() => setPicking('dropoff')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: touchTarget + spacing.xs,
              }}
            >
              <View
                style={{ width: DEST_SQUARE, height: DEST_SQUARE, backgroundColor: colors.accent.rose }}
              />
              <LuminaText
                token="h3"
                style={{ flex: 1 }}
                color={dropoff ? undefined : colors.onSurface.muted}
                numberOfLines={1}
              >
                {dropoff?.name ?? 'Where to?'}
              </LuminaText>
            </Pressable>
          </GlassCard>
        </View>

        {/* Recents are one group, not three cards — same list, one container.
            Hidden entirely for a customer with no history: an empty "Recent"
            heading is worse than no heading. */}
        {recents.length > 0 ? (
          <GlassGroup title="Recent" style={{ marginTop: spacing.xl }}>
            {recents.map((r, i) => (
              <GlassListItem
                key={r.address}
                title={r.address}
                subtitle={[formatDistance(r.route), formatDuration(r.route)]
                  .filter(Boolean)
                  .join(' · ')}
                last={i === recents.length - 1}
                onPress={() => useRecent(r.address)}
                icon={
                  <View
                    style={{
                      width: RECENT_SQUARE,
                      height: RECENT_SQUARE,
                      backgroundColor: withOpacity(colors.accent.rose, RECENT_SQUARE_ALPHA),
                    }}
                  />
                }
              />
            ))}
          </GlassGroup>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 'auto', paddingTop: spacing.md }}>
          <NeuButton
            variant="secondary"
            title="Schedule"
            onPress={() => navigation.navigate('Scheduled')}
            style={{ flex: 1 }}
          />
          <NeuButton
            title="Ride now"
            onPress={toTiers}
            disabled={!ready}
            accessibilityLabel="Ride now"
            style={{ flex: 1 }}
          />
        </View>

        <PlacePicker
          visible={picking !== null}
          title={picking === 'pickup' ? 'Pick up from' : 'Where to?'}
          places={places}
          excludeId={picking === 'pickup' ? dropoff?.id : pickup?.id}
          onSelect={(p) => (picking === 'pickup' ? setPickup(p) : setDropoff(p))}
          onClose={() => setPicking(null)}
        />
      </View>
    </ScreenContainer>
  );
}
