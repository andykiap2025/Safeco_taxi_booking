// LUMINA GLASS UI — GlassGroup. The container for a set of RELATED rows:
// one card, one border, one shadow, one halo, with its rows stacked flush
// inside and divided by hairline separators. This is the app-wide answer to
// "these belong together" — never a column of individual cards, which reads
// as N unrelated things and wastes vertical space.
//
// Anatomy: an optional overline caption sits above the card on the gradient
// (so the group is labelled without spending a row), then an unpadded
// GlassCard whose children are clipped to the card radius by an inner view —
// clipping on the card body itself would cut off its iOS shadow. Rows read
// `rowPaddingH` from GroupContext and inset themselves, so a pressed row can
// tint edge to edge while its text still lines up with card padding.

import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { borders, colors, radius as radii, spacing } from '../../lumina';
import { GlassCard, type GlassCardVariant } from './GlassCard';
import { GroupContext } from './GroupContext';
import { LuminaText } from './LuminaText';

export interface GlassGroupProps {
  /** Overline caption above the card (on the gradient), e.g. "Recent". */
  title?: string;
  variant?: GlassCardVariant;
  borderRadius?: keyof typeof radii;
  /** Horizontal inset the rows apply (default 20dp, matching GlassCard). */
  inset?: number;
  /** Outer wrapper style — margins go here, so the card's halo stays centred. */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

// Matches GlassCard's own 20dp body padding, so a group and a plain card
// present their content on the same left edge.
const GROUP_INSET = spacing.lg + spacing.xs;

export function GlassGroup({
  title,
  variant,
  borderRadius = 'glass',
  inset = GROUP_INSET,
  style,
  children,
}: GlassGroupProps) {
  const corner = radii[borderRadius];
  return (
    <View style={style}>
      {title ? (
        <LuminaText
          token="overline"
          color={colors.text.muted}
          shadow="soft"
          style={{ marginBottom: spacing.md }}
        >
          {title}
        </LuminaText>
      ) : null}
      <GlassCard variant={variant} borderRadius={borderRadius} style={{ padding: 0 }}>
        {/* Inner clipper: keeps pressed row fills inside the rounded corners
            without putting overflow:'hidden' on the shadowed card body (which
            would clip its iOS shadow). Inset by the border so the fill stops
            just inside the edge instead of riding over the curve. */}
        <View style={{ borderRadius: corner - borders.glass, overflow: 'hidden' }}>
          <GroupContext.Provider value={{ rowPaddingH: inset }}>{children}</GroupContext.Provider>
        </View>
      </GlassCard>
    </View>
  );
}
