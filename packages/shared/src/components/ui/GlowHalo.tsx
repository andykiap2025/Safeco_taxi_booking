// LUMINA GLASS UI — GlowHalo. Android cannot render colored shadow glows
// (only `elevation` draws, and it is monochrome), so every colored glow in
// the suite is faked with this layer: two stacked, oversized rounded views
// behind the subject, opacity-stepped to soften the edge like a blur.
// Render it as the sibling BEFORE the surface it haloes, inside a
// position-relative wrapper sized to that surface.

import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { spacing } from '../../lumina';

export interface GlowHaloProps {
  /** Halo color — take it from `shadows.halo` (teal/violet/error). */
  color: string;
  /** Border radius of the surface being haloed. */
  radius: number;
  /** How far the glow extends past the surface on every side. */
  spread?: number;
  style?: StyleProp<ViewStyle>;
}

// Opacity steps for the two layers — outer soft edge, inner hot core.
const OUTER_OPACITY = 0.25;
const INNER_OPACITY = 0.5;

export function GlowHalo({ color, radius, spread = spacing.lg, style }: GlowHaloProps) {
  const inner = spread / 2;
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: -spread,
          left: -spread,
          right: -spread,
          bottom: -spread,
        },
        style,
      ]}
    >
      {/* Outer, faint layer — reads as the blurred falloff. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: radius + spread,
          backgroundColor: color,
          opacity: OUTER_OPACITY,
        }}
      />
      {/* Inner, brighter layer — the core of the glow. */}
      <View
        style={{
          position: 'absolute',
          top: inner,
          left: inner,
          right: inner,
          bottom: inner,
          borderRadius: radius + inner,
          backgroundColor: color,
          opacity: INNER_OPACITY,
        }}
      />
    </View>
  );
}
