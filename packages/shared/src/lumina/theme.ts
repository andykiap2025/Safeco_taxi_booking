// LUMINA GLASS — global theme tokens (CLAUDE.md "Visual system"). The single
// source of truth for colors, type, spacing and radius across all three apps.
// Zero hardcoded style values may exist outside this folder.
// v2 polish pass (2026-08-12): richer gradient stops, contrast floors
// (body text never below 0.85 on the gradient), glass edge/highlight tokens,
// brighter CTA gradient.

export const colors = {
  // Base
  background: '#0f0f1a', // deepest layer — also the pre-gradient flash guard
  meshStart: '#1e1b4b', // deep indigo
  meshMid: '#581c87', // rich purple
  meshEnd: '#0f766e', // deep teal

  // Glass surfaces (ALL cards, sheets, modals)
  glass: {
    fill: 'rgba(255, 255, 255, 0.06)',
    fillHover: 'rgba(255, 255, 255, 0.10)', // pressed cards too
    border: 'rgba(255, 255, 255, 0.18)',
    borderFocus: 'rgba(255, 255, 255, 0.35)',
    borderFocusTeal: 'rgba(20, 184, 166, 0.80)', // inputs on focus
    borderError: 'rgba(239, 68, 68, 0.60)',
    topHighlight: 'rgba(255, 255, 255, 0.25)', // light hitting the top edge
    topHighlightPressed: 'rgba(255, 255, 255, 0.35)',
  },

  // Primary action (CTAs, active states, progress)
  primary: {
    base: '#0d9488',
    light: '#14b8a6',
    dark: '#0f766e',
    glow: 'rgba(13, 148, 136, 0.4)',
  },

  // CTA gradient — brighter than the surface palette on purpose.
  gradientButton: ['#14b8a6', '#7c3aed'] as [string, string],

  // Secondary / accent
  accent: {
    violet: '#8b5cf6',
    violetGlow: 'rgba(139, 92, 246, 0.35)',
    rose: '#f43f5e', // inherits magenta's old duties: destination + safety
  },

  // Ambient orbs (ScreenContainer)
  orbs: {
    violet: 'rgba(139, 92, 246, 0.15)',
    teal: 'rgba(20, 184, 166, 0.12)',
  },

  // Text hierarchy — contrast floors for the gradient ground:
  // body ≥0.85, subtitles ≥0.70, placeholder 0.40, disabled 0.30.
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.85)',
    muted: 'rgba(255, 255, 255, 0.70)',
    placeholder: 'rgba(255, 255, 255, 0.40)',
    disabled: 'rgba(255, 255, 255, 0.30)',
    inverse: '#0f0f1a',
  },

  // Light surfaces (2026-08-12 user directive: cards & buttons white/grey).
  // Content ON these surfaces uses onSurface ink, never the white text ramp.
  surface: {
    card: 'rgba(255, 255, 255, 0.95)', // frosted-white card body
    cardPressed: '#e9e9ee',
    button: '#ffffff', // primary CTA fill
    buttonPressed: '#e4e4ea',
    buttonSecondary: 'rgba(255, 255, 255, 0.85)',
    well: '#e9e9ee', // input well on a light card
    border: 'rgba(15, 15, 26, 0.12)', // hairlines on light surfaces
    separator: 'rgba(15, 15, 26, 0.08)',
  },
  onSurface: {
    primary: '#0f0f1a',
    secondary: 'rgba(15, 15, 26, 0.75)',
    muted: 'rgba(15, 15, 26, 0.55)',
    placeholder: 'rgba(15, 15, 26, 0.40)',
    disabled: 'rgba(15, 15, 26, 0.35)',
  },

  // Feedback
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',

  // Overlays
  backdrop: 'rgba(0, 0, 0, 0.70)',
  separator: 'rgba(255, 255, 255, 0.06)',
  inputWell: 'rgba(0, 0, 0, 0.35)', // darker than cards so inputs recede
  countryBubble: 'rgba(255, 255, 255, 0.10)',
} as const;

// Structural widths — glass edges are thicker than hairlines.
export const borders = {
  hairline: 1,
  glass: 1.5,
  button: 2,
} as const;

export const typography = {
  brand: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5, lineHeight: 38 },
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, lineHeight: 40 },
  h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, lineHeight: 36 },
  tagline: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2, lineHeight: 28 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '600', letterSpacing: 0, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', letterSpacing: 0, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '500', letterSpacing: 0, lineHeight: 22 },
  listTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0, lineHeight: 20 },
  listSubtitle: { fontSize: 13, fontWeight: '400', letterSpacing: 0, lineHeight: 18 },
  input: { fontSize: 18, fontWeight: '600', letterSpacing: 0, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.3, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '800', letterSpacing: 0.8, lineHeight: 24 },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
} as const;

export type TypographyToken = keyof typeof typography;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  iconButton: 14, // rounded square, not a circle
  input: 16,
  lg: 16,
  glass: 20, // cards — the premium radius
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

export const touchTarget = 48; // dp minimum, unchanged from prior law

export const lumina = { colors, borders, typography, spacing, radius, touchTarget } as const;
export default lumina;
