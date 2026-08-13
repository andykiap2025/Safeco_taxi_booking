// LUMINA GLASS UI — GlassBadge. Tinted status pill: tone color at 20% for
// the fill, 40% for the border (via withOpacity — no raw color literals),
// caption type in the tone colour. Badges now sit on LIGHT cards — the 20%
// tone fill on white still reads, and the ink-free tone text needs no
// shadow there.

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Text, View } from 'react-native';
import { borders, colors, radius, spacing, typography } from '../../lumina';
import { withOpacity } from './util';

export type GlassBadgeTone = 'primary' | 'violet' | 'rose' | 'error';

export interface GlassBadgeProps {
  tone?: GlassBadgeTone;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const FILL_ALPHA = 0.2;
const BORDER_ALPHA = 0.4;

const TONES: Record<GlassBadgeTone, { base: string; text: string }> = {
  primary: { base: colors.primary.base, text: colors.primary.light },
  violet: { base: colors.accent.violet, text: colors.accent.violet },
  rose: { base: colors.accent.rose, text: colors.accent.rose },
  error: { base: colors.error, text: colors.error },
};

export function GlassBadge({ tone = 'primary', style, children }: GlassBadgeProps) {
  const palette = TONES[tone];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.full,
          backgroundColor: withOpacity(palette.base, FILL_ALPHA),
          borderWidth: borders.hairline,
          borderColor: withOpacity(palette.base, BORDER_ALPHA),
        },
        style,
      ]}
    >
      <Text style={{ ...typography.caption, color: palette.text }}>{children}</Text>
    </View>
  );
}
