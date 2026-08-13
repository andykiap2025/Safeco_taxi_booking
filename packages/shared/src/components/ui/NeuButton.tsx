// LUMINA GLASS UI — NeuButton. v3 (white-surface directive):
//   primary   — WHITE pill (surface.button), dark ink title, 2dp
//               surface.border edge, v2 floating shadow stack, and the teal
//               GlowHalo kept behind it (halo.teal → halo.tealPressed while
//               held — the glow is what keeps white premium, not flat).
//               Press = buttonPressed fill + 0.95 spring. `loading` swaps
//               the title for a teal spinner and pulses the glow.
//   secondary — light fill (surface.buttonSecondary), ink title, hairline
//               surface.border, plus the layered dark shade bottom-right
//               (the neumorphic relief against the gradient behind it).
//   icon      — 48dp rounded-square light tile (radius.iconButton).
// All three are light surfaces: they provide surface 'light' to children.

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import {
  borders,
  colors,
  pressIn,
  pressOut,
  pressScale,
  radius,
  shadows,
  shimmer,
  spacing,
  springs,
  touchTarget,
  typography,
} from '../../lumina';
import { GlowHalo } from './GlowHalo';
import { SurfaceProvider } from './SurfaceContext';

export type NeuButtonVariant = 'primary' | 'secondary' | 'icon';

export interface NeuButtonProps {
  variant?: NeuButtonVariant;
  title?: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

// Control height per spec (56dp): minimum touch target + one small step.
const BUTTON_HEIGHT = touchTarget + spacing.sm;
// v2 press spec for the primary CTA: deeper squeeze, softer spring.
const PRIMARY_PRESS_SCALE = 0.95;
const PRIMARY_PRESS_FRICTION = 4;
// Loading / disabled alphas per spec.
const LOADING_OPACITY = 0.8;
const DISABLED_OPACITY = 0.5;
// Icon tile: 24dp glyph size per spec.
const ICON_GLYPH_SIZE = spacing.xl;

export function NeuButton({
  variant = 'primary',
  title,
  icon,
  onPress,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: NeuButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(false);

  // Loading: pulse the glow on the shared shimmer loop.
  useEffect(() => {
    if (!loading) return;
    pulse.setValue(0);
    const loop = shimmer(pulse);
    loop.start();
    return () => loop.stop();
  }, [loading, pulse]);

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  const inactive = disabled || loading;

  const handlePressIn = () => {
    setPressed(true);
    if (variant === 'primary') {
      Animated.spring(scale, {
        toValue: PRIMARY_PRESS_SCALE,
        ...springs.press,
        friction: PRIMARY_PRESS_FRICTION,
      }).start();
    } else {
      pressIn(scale, variant === 'icon' ? pressScale.icon : pressScale.button).start();
    }
  };
  const handlePressOut = () => {
    setPressed(false);
    pressOut(scale).start();
  };

  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel ?? title,
    accessibilityState: { disabled: inactive, busy: loading },
  };

  if (variant === 'primary') {
    return (
      <Pressable
        {...a11y}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={inactive}
        style={[{ minHeight: touchTarget }, style, disabled && { opacity: DISABLED_OPACITY }]}
      >
        <Animated.View style={{ transform: [{ scale }], position: 'relative' }}>
          {/* Teal glow — brighter while held, pulsing while loading. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: loading ? pulseOpacity : 1,
            }}
          >
            <GlowHalo
              color={pressed ? shadows.halo.tealPressed : shadows.halo.teal}
              radius={radius.full}
            />
          </Animated.View>
          <View
            style={{
              height: BUTTON_HEIGHT,
              borderRadius: radius.full,
              backgroundColor: pressed ? colors.surface.buttonPressed : colors.surface.button,
              borderWidth: borders.button,
              borderColor: colors.surface.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.xl,
              overflow: 'hidden',
              opacity: loading ? LOADING_OPACITY : 1,
              ...shadows.floating,
            }}
          >
            <SurfaceProvider value="light">
              {loading ? (
                <ActivityIndicator color={colors.primary.base} />
              ) : (
                <Text style={{ ...typography.button, color: colors.onSurface.primary }}>
                  {title}
                </Text>
              )}
            </SurfaceProvider>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    const relief = shadows.neumorphicRaised;
    return (
      <Pressable
        {...a11y}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={inactive}
        style={[{ minHeight: touchTarget }, style, disabled && { opacity: DISABLED_OPACITY }]}
      >
        <Animated.View style={{ transform: [{ scale }], position: 'relative' }}>
          {/* Dark shade falling bottom-right, per the layered raised spec —
              this reads against the gradient behind the button. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: relief.dark.offset.height,
              left: relief.dark.offset.width,
              right: -relief.dark.offset.width,
              bottom: -relief.dark.offset.height,
              borderRadius: radius.full,
              backgroundColor: relief.dark.color,
            }}
          />
          <View
            style={{
              height: BUTTON_HEIGHT,
              borderRadius: radius.full,
              backgroundColor: pressed
                ? colors.surface.buttonPressed
                : colors.surface.buttonSecondary,
              borderWidth: borders.hairline,
              borderColor: colors.surface.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.xl,
              overflow: 'hidden',
            }}
          >
            <SurfaceProvider value="light">
              <Text style={{ ...typography.button, color: colors.onSurface.secondary }}>
                {title}
              </Text>
            </SurfaceProvider>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  // icon variant — 48dp rounded-square light tile.
  return (
    <Pressable
      {...a11y}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={inactive}
      hitSlop={spacing.xs}
      style={[style, disabled && { opacity: DISABLED_OPACITY }]}
    >
      <Animated.View
        style={{
          width: touchTarget,
          height: touchTarget,
          borderRadius: radius.iconButton,
          backgroundColor: pressed ? colors.surface.buttonPressed : colors.surface.buttonSecondary,
          borderWidth: borders.hairline,
          borderColor: colors.surface.border,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
          ...shadows.elevated,
        }}
      >
        <SurfaceProvider value="light">
          {typeof icon === 'string' ? (
            <Text style={{ fontSize: ICON_GLYPH_SIZE, color: colors.onSurface.primary }}>
              {icon}
            </Text>
          ) : (
            icon
          )}
        </SurfaceProvider>
      </Animated.View>
    </Pressable>
  );
}
