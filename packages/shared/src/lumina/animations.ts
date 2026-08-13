// LUMINA GLASS — animation constants and helpers. Core RN Animated only
// (react-native-reanimated is not a dependency). Every micro-interaction in
// the suite uses these values; no ad-hoc durations in components.

import { Animated, Easing } from 'react-native';

export const durations = {
  instant: 100, // list-item press fades
  fast: 150, // glow fade-in
  base: 200, // border transitions, modal dismiss
  entrance: 300, // screen fades, modal present
} as const;

export const springs = {
  press: { friction: 5, tension: 300, useNativeDriver: true },
  release: { friction: 3, tension: 300, useNativeDriver: true },
} as const;

export const pressScale = {
  button: 0.96,
  icon: 0.9,
} as const;

export const stagger = { perChild: 100, translateY: 20 } as const;

export function pressIn(scale: Animated.Value, to: number = pressScale.button) {
  return Animated.spring(scale, { toValue: to, ...springs.press });
}

export function pressOut(scale: Animated.Value) {
  return Animated.spring(scale, { toValue: 1, ...springs.release });
}

// Screen/section entrance: fade + rise. Drive per-child delays with `delay`.
export function entrance(opacity: Animated.Value, translateY: Animated.Value, delay = 0) {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: durations.entrance,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: durations.entrance,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
  ]);
}

// Error feedback: subtle horizontal shake.
export function shake(translateX: Animated.Value) {
  const step = (to: number, duration: number) =>
    Animated.timing(translateX, { toValue: to, duration, easing: Easing.linear, useNativeDriver: true });
  return Animated.sequence([step(-5, 60), step(5, 60), step(-3, 60), step(3, 60), step(0, 60)]);
}

// Success feedback: brief pop; pair with a teal GlowHalo pulse.
export function pop(scale: Animated.Value) {
  return Animated.sequence([
    Animated.timing(scale, { toValue: 1.05, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    Animated.spring(scale, { toValue: 1, ...springs.release }),
  ]);
}

// Skeleton shimmer: loop this and map the value to a translateX sweep.
export function shimmer(progress: Animated.Value) {
  return Animated.loop(
    Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
  );
}

export const animations = { durations, springs, pressScale, stagger, pressIn, pressOut, entrance, shake, pop, shimmer } as const;
export default animations;
