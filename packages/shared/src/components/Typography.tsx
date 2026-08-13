// Text primitives — modern app voice (decided 2026-08-12): system sans-serif
// for ALL UI text; Source Serif 4 survives only in the brand wordmark; mono
// only for plates, countdowns and figures that must align.

import { Platform, Text, type TextProps } from 'react-native';
import { colors, typography } from '../theme';

const MONO_FAMILY = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
const WEIGHTS: Record<Weight, '400' | '500' | '600' | '700'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export interface BodyTextProps extends TextProps {
  weight?: Weight;
  italic?: boolean;
  size?: number;
  color?: string;
}

// System sans — the default voice for every piece of UI text.
export function BodyText({
  weight = 'regular',
  italic,
  size = typography.size.body,
  color = colors.ink,
  style,
  ...rest
}: BodyTextProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontSize: size, color, fontWeight: WEIGHTS[weight], fontStyle: italic ? 'italic' : 'normal' },
        style,
      ]}
    />
  );
}

// DEPRECATED alias — screens written during the newsprint phase import
// SerifText; it renders the sans body voice now. Use BodyText in new code.
export const SerifText = BodyText;
export type SerifTextProps = BodyTextProps;

// The one place serif survives: the brand wordmark ("SAFECO").
export function BrandWordmark({ size = 28, color = colors.ink, style, children, ...rest }: BodyTextProps) {
  return (
    <Text {...rest} style={[{ fontFamily: typography.serif.bold, fontSize: size, color, letterSpacing: 0.5 }, style]}>
      {children}
    </Text>
  );
}

export interface MonoTextProps extends TextProps {
  size?: number;
  color?: string;
  bold?: boolean;
}

// Tabular voice only: plates, countdowns, aligned figures.
export function MonoText({ size = typography.size.meta, color = colors.neutral700, bold, style, ...rest }: MonoTextProps) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: MONO_FAMILY, fontSize: size, color, fontWeight: bold ? '700' : '400' }, style]}
    />
  );
}

// Section label — sans caps, quiet. (No longer mono: newsprint furniture is
// banned per CLAUDE.md "Visual voice".)
export function Kicker({ size = 12, color = colors.neutral700, style, children, ...rest }: MonoTextProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontSize: size, color, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
