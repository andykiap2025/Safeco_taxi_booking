// Plan a ride — deciding screen, so details dominate: the map is a strip and
// the glass sheet below carries the work (map balance rule). Lumina Glass:
// pickup/destination live in one GlassCard (white origin ring, rose
// destination square), recents are jewel rows, footer pairs the secondary
// Schedule with the gradient Ride now CTA.

import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistance, formatDuration, recentDestinations } from '@safeco/shared';
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
  const toTiers = () => navigation.navigate('TierSelect');
  const recents = useAppState(() => recentDestinations());

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

        {/* Pickup + destination in one glass card */}
        <View style={{ marginTop: spacing.lg }}>
          <GlassCard padding="lg">
            {/* Pickup */}
            <View
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
              <LuminaText token="listTitle" style={{ flex: 1 }}>
                Home · 14 Kingsway
              </LuminaText>
              <LuminaText token="overline" color={colors.onSurface.muted}>
                Edit
              </LuminaText>
            </View>

            {/* Destination — the active field: rose square glyph */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Destination 8 Rowan St"
              onPress={toTiers}
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
              <LuminaText token="h3" style={{ flex: 1 }}>
                8 Rowan St
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
                onPress={toTiers}
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
          <NeuButton title="Ride now" onPress={toTiers} style={{ flex: 1 }} />
        </View>
      </View>
    </ScreenContainer>
  );
}
