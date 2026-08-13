// LUMINA GLASS UI — GlassCard. v3 (white-surface directive): every card is
// three physical layers —
//   (a) back: a soft violet GlowHalo (shadows.halo.cardGlow) behind the body,
//   (b) body: frosted-WHITE surface.card fill, 1.5dp surface.border edge,
//       the premium 20dp radius, and the elevated shadow stack,
//   (c) top highlight: a near-white 1px line tucked inside the top edge
//       (inset horizontally so it never crosses the rounded corners).
// The card provides surface 'light' to its children, so LuminaText defaults
// flip to dark ink with no shadow. Optional onPress makes the card itself
// pressable: cardPressed fill + a 0.98 scale spring while held.

import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, Pressable, View } from 'react-native';
import { borders, colors, radius, shadows, spacing, springs } from '../../lumina';
import { GlowHalo } from './GlowHalo';
import { SurfaceProvider } from './SurfaceContext';
import { withOpacity } from './util';

export type GlassCardVariant = 'default' | 'elevated' | 'pressed';

export interface GlassCardProps {
  variant?: GlassCardVariant;
  padding?: keyof typeof spacing;
  borderRadius?: keyof typeof radius;
  /** Makes the whole card pressable (press visuals + 0.98 scale spring). */
  onPress?: () => void;
  /** Applied to the card body — override corners, padding, etc. Give the
   * card outer margins via its parent (gap/wrapper), not here, so the halo
   * stays centered. */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  accessibilityLabel?: string;
}

// v2 minimum card padding: 20dp (lg + xs).
const CARD_PADDING = spacing.lg + spacing.xs;
// Back-glow spread behind every card.
const HALO_SPREAD = spacing.md;
// Pressable cards squeeze to 0.98 while held (v2 spec).
const CARD_PRESS_SCALE = 0.98;
// The static `pressed` variant tightens the elevated shadow.
const PRESSED_RADIUS_FACTOR = 0.7;
const PRESSED_ELEVATION_DROP = 2;
// Lit top edge on the white surface: near-opaque white hairline.
const TOP_HIGHLIGHT_ALPHA = 0.9;

export function GlassCard({
  variant = 'default',
  padding,
  borderRadius = 'glass',
  onPress,
  style,
  children,
  accessibilityLabel,
}: GlassCardProps) {
  const cornerRadius = radius[borderRadius];
  const scale = useRef(new Animated.Value(1)).current;
  const [held, setHeld] = useState(false);

  const pressedVisual = variant === 'pressed' || (onPress != null && held);

  const bodyStyle: ViewStyle = {
    backgroundColor: pressedVisual ? colors.surface.cardPressed : colors.surface.card,
    borderWidth: borders.glass,
    borderColor: colors.surface.border,
    borderRadius: cornerRadius,
    padding: padding != null ? spacing[padding] : CARD_PADDING,
  };

  const shadowStyle: ViewStyle =
    variant === 'elevated'
      ? shadows.floating
      : variant === 'pressed'
        ? {
            ...shadows.elevated,
            shadowRadius: (shadows.elevated.shadowRadius ?? 0) * PRESSED_RADIUS_FACTOR,
            elevation: Math.max(0, (shadows.elevated.elevation ?? 0) - PRESSED_ELEVATION_DROP),
          }
        : shadows.elevated;

  const card = (
    <Animated.View style={{ position: 'relative', transform: [{ scale }] }}>
      <GlowHalo color={shadows.halo.cardGlow} radius={cornerRadius} spread={HALO_SPREAD} />
      <View style={[bodyStyle, shadowStyle, style]}>
        <SurfaceProvider value="light">{children}</SurfaceProvider>
        {/* Light catching the top edge — inset past the corner curves. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: cornerRadius / 2,
            right: cornerRadius / 2,
            height: borders.hairline,
            backgroundColor: withOpacity(colors.text.primary, TOP_HIGHLIGHT_ALPHA),
          }}
        />
      </View>
    </Animated.View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        setHeld(true);
        Animated.spring(scale, { toValue: CARD_PRESS_SCALE, ...springs.press }).start();
      }}
      onPressOut={() => {
        setHeld(false);
        Animated.spring(scale, { toValue: 1, ...springs.release }).start();
      }}
    >
      {card}
    </Pressable>
  );
}
