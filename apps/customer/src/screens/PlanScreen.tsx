// Plan a ride — deciding screen, so details dominate: the map is a strip and
// the glass sheet below carries the work (map balance rule). Lumina Glass:
// pickup/destination live in one GlassCard (white origin ring, rose
// destination square), recents are jewel rows, footer pairs the secondary
// Schedule with the gradient Ride now CTA.

import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borders, colors, radius, spacing, touchTarget } from '@safeco/shared/lumina';
import { MapPlate } from '@safeco/shared/components';
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

const RECENTS = [
  { title: 'Studio · 8 Rowan St', subtitle: '4.2 km · 12 min' },
  { title: 'Ferry Terminal', subtitle: '6.8 km · 19 min' },
  { title: 'Rowan St Market', subtitle: '2.1 km · 7 min' },
];

// Origin ring / destination square geometry (visual glyphs, not tap targets).
const ORIGIN_RING = 16;
const DEST_SQUARE = 13;
const RECENT_SQUARE = 10;
const RECENT_SQUARE_ALPHA = 0.5;

export function PlanScreen({ navigation }: ScreenProps<'Plan'>) {
  const insets = useSafeAreaInsets();
  const toTiers = () => navigation.navigate('TierSelect');

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

        {/* Recents are one group, not three cards — same list, one container */}
        <GlassGroup title="Recent" style={{ marginTop: spacing.xl }}>
          {RECENTS.map((r, i) => (
            <GlassListItem
              key={r.title}
              title={r.title}
              subtitle={r.subtitle}
              last={i === RECENTS.length - 1}
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
