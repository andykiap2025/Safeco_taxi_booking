// LUMINA GLASS — global shadow system. Every shadow in the app suite comes
// from here; components never define ad-hoc shadow values.
//
// ANDROID REALITY (do not "fix" this): React Native Android ignores the iOS
// shadow* props — only `elevation` renders (with a shadowColor tint on
// API 28+), and it cannot do colored glows at elevation 0, dual neumorphic
// shadows, or insets. So this file carries TWO kinds of definition:
//   1. RN style objects (`ambient`, `elevated`, `floating`, `glow`, `text`)
//      — spread into styles; on Android the elevation part renders and the
//      components pair them with a <GlowHalo> gradient layer for the color.
//   2. Layered specs (`neumorphicRaised`, `neumorphicPressed`, `inset`)
//      — NOT valid RN styles; consumed by the /ui components, which build
//      them from absolutely-positioned highlight/shade views and gradients
//      (the approved layered approach).

import type { TextStyle, ViewStyle } from 'react-native';

export type RNShadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

// Ambient colored glow behind major containers (v2: the card back-glow —
// soft violet, tight). elevation 0 → invisible as a shadow on Android;
// components add a GlowHalo (violet) behind the surface.
export const ambient: RNShadow = {
  shadowColor: 'rgba(139, 92, 246, 0.15)',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 20,
  elevation: 0,
};

// Standard elevated cards (v2 card stack).
export const elevated: RNShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.45,
  shadowRadius: 24,
  elevation: 12,
};

// Heavy elevation for primary buttons and modals (v2 button stack).
export const floating: RNShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 16,
};

// Colored glow under primary buttons — pair with a teal GlowHalo on Android.
export const glow: RNShadow = {
  shadowColor: 'rgba(13, 148, 136, 0.50)',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 20,
  elevation: 0,
};

// Text shadows — EVERY text element over the gradient carries one (v2 rule).
export type RNTextShadow = Pick<TextStyle, 'textShadowColor' | 'textShadowOffset' | 'textShadowRadius'>;

export const text: RNTextShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.40)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
};

// Brand wordmark / hero headlines.
export const textStrong: RNTextShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.60)',
  textShadowOffset: { width: 0, height: 3 },
  textShadowRadius: 8,
};

// Quiet shadow for small list text.
export const textSoft: RNTextShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.30)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

// ── Layered specs (component-built, not spreadable) ─────────────────────────

export interface LayeredShadowSpec {
  light: { color: string; offset: { width: number; height: number }; radius: number };
  dark: { color: string; offset: { width: number; height: number }; radius: number };
}

// Soft-UI raised: light catches the top-left edge, shade falls bottom-right.
export const neumorphicRaised: LayeredShadowSpec = {
  light: { color: 'rgba(255, 255, 255, 0.08)', offset: { width: -2, height: -4 }, radius: 8 },
  dark: { color: 'rgba(0, 0, 0, 0.50)', offset: { width: 4, height: 8 }, radius: 12 },
};

// Soft-UI pressed: the relief inverts and tightens.
export const neumorphicPressed: LayeredShadowSpec = {
  light: { color: 'rgba(255, 255, 255, 0.05)', offset: { width: 2, height: 4 }, radius: 6 },
  dark: { color: 'rgba(0, 0, 0, 0.60)', offset: { width: -2, height: -4 }, radius: 10 },
};

export interface InsetShadowSpec {
  top: { color: string; height: number };
  bottom: { color: string; height: number };
}

// Carved input wells: dark gradient strip under the top edge, faint light
// hairline above the bottom edge.
export const inset: InsetShadowSpec = {
  top: { color: 'rgba(0, 0, 0, 0.60)', height: 6 },
  bottom: { color: 'rgba(255, 255, 255, 0.08)', height: 2 },
};

// Halo colors for the GlowHalo gradient layers (the Android-truthful glow).
export const halo = {
  teal: 'rgba(20, 184, 166, 0.40)', // primary button resting glow
  tealPressed: 'rgba(20, 184, 166, 0.60)', // press intensifies the glow
  tealFocus: 'rgba(20, 184, 166, 0.30)', // input focus glow
  violet: 'rgba(139, 92, 246, 0.35)',
  cardGlow: 'rgba(139, 92, 246, 0.15)', // card layer-1 ambient light
  error: 'rgba(239, 68, 68, 0.35)',
} as const;

export const shadows = {
  ambient,
  elevated,
  floating,
  glow,
  text,
  textStrong,
  textSoft,
  neumorphicRaised,
  neumorphicPressed,
  inset,
  halo,
} as const;
export default shadows;
