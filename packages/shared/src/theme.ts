// Safeco Taxi Booking — design tokens and the elevation scale.
// Platform-agnostic plain values (the Admin app may be web): no React Native
// imports, no StyleSheet objects. RN apps can spread these directly (keys map
// 1:1 onto RN style props); web maps elevation to box-shadow:
//   `${offset.width}px ${offset.height}px ${shadowRadius * 2}px rgba(ink, opacity)`.
// Single source of truth for every shadow in the app: components must use a
// level from `elevation`, never ad-hoc shadow values (CLAUDE.md).
// Light source is top-left, always — offsets grow down-right.
// Values approved 2026-08-12.

export const colors = {
  paper: '#f3f2f2', // page ground
  surface: '#eae9e9', // cards, tinted fills, photo placeholders
  ink: '#201e1d', // text, structural rules, origin markers
  shadowInk: '#2d2b2b', // the only permitted shadow colour

  // Cyan — the only interactive colour.
  accent: '#0088b0',
  accentLight: '#38a6cf', // emboss gradient, top-left end
  accentHover: '#1186ac', // pointer platforms only (Admin desktop)
  accentPressed: '#006786',
  accentDeep: '#006786', // body-size accent text (contrast ≥4.5:1 on paper)
  accentSelection: '#cbeeff', // selected-row tint
  accentTint: '#e9f8ff',

  // Magenta — reserved for destination + safety. Never alongside cyan
  // in the same small component.
  magenta: '#d6006c',
  magentaText: '#aa0b56', // overdue timers, WAITING, CANCEL, countdowns
  magentaTint: '#fff1f4',

  neutral300: '#d7d3d3', // hairline dividers, light borders
  neutral400: '#bab6b6', // handles, unselected radios/stars
  neutral600: '#7d7979', // faint captions
  neutral700: '#605d5d', // secondary text, mono kickers
  neutral800: '#444141', // long-form body copy
  white: '#ffffff', // text/icons on accent fills

  embossHighlight: 'rgba(255,255,255,0.35)', // 1px top hairline on raised controls
} as const;

export const typography = {
  // Family names match @expo-google-fonts/source-serif-4 exports — every app
  // loads them via useFonts before rendering.
  serif: {
    regular: 'SourceSerif4_400Regular',
    semibold: 'SourceSerif4_600SemiBold', // emphasis, prices, headings
    bold: 'SourceSerif4_700Bold', // masthead only
    italic: 'SourceSerif4_400Regular_Italic', // quotes and rider notes
  },
  mono: 'Menlo', // per-platform monospace resolved in components/Typography
  size: {
    kicker: 11, // mono, uppercase, letterSpacing ~0.9
    meta: 13,
    body: 16, // minimum body size — never smaller for running text
    emphasis: 18,
    title: 26,
    headline: 31,
    stat: 40,
  },
} as const;

export const space = {
  s1: 5,
  s2: 10,
  s3: 15,
  s4: 20,
  s6: 30,
  s8: 40,
  gutter: 22, // standard screen padding
} as const;

export const radius = {
  sm: 1,
  md: 2, // the default — buttons, cards, chips
  lg: 4,
} as const;

export const minTapTarget = 48;

// ─── Elevation ──────────────────────────────────────────────────────────────
// Each level carries Android `elevation` and the iOS shadow* values together;
// they are tuned to match visually, not numerically. Android's elevation
// shadow direction is OS-controlled (falls straight down), so the top-left
// light bias is exact on iOS, approximate on Android; directional emboss cues
// come from the gradient/highlight treatment, not from shadow offsets.

export interface ElevationStyle {
  elevation: number;
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

export type ElevationLevel =
  | 'surface' // page ground, list rows, dividers, the map plate
  | 'raised' // resting cards, tier options, stat tiles, buttons at rest
  | 'lifted' // elements floating over the map: car puck, over-map controls
  | 'floating' // bottom sheets, dialogs, job-offer card, selected tier card
  | 'pressed'; // any raised control while pressed — the emboss depresses

export const elevation: Record<ElevationLevel, ElevationStyle> = {
  surface: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  raised: {
    elevation: 2,
    shadowColor: colors.shadowInk,
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
  },
  lifted: {
    elevation: 4,
    shadowColor: colors.shadowInk,
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  floating: {
    elevation: 8,
    shadowColor: colors.shadowInk,
    shadowOffset: { width: 2, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  pressed: {
    elevation: 1,
    shadowColor: colors.shadowInk,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
} as const;

export const theme = { colors, typography, space, radius, minTapTarget, elevation } as const;
export default theme;
