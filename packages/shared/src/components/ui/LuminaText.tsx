// LUMINA GLASS UI — LuminaText. Typography with surface-aware DEFAULTS:
// directly on the gradient it reads white with the standard text shadow; on
// a light surface (inside GlassCard / jewel rows / light NeuButtons, which
// provide surface 'light') it defaults to dark ink with no shadow. Explicit
// `color`/`shadow` props ALWAYS win over the context defaults.
//
// API (stable — screens across all three apps consume it):
//   token  — typography scale key (default 'body')
//   color  — explicit text color
//   shadow — 'none' | 'soft' | 'text' | 'strong' (textSoft/text/textStrong)

import type { TextProps, TextStyle } from 'react-native';
import { Text } from 'react-native';
import type { TypographyToken } from '../../lumina';
import { colors, shadows, typography } from '../../lumina';
import type { RNTextShadow } from '../../lumina';
import { useSurface } from './SurfaceContext';

export type LuminaTextShadow = 'none' | 'soft' | 'text' | 'strong';

export interface LuminaTextProps extends TextProps {
  /** Typography scale token (default 'body'). */
  token?: TypographyToken;
  /** Explicit color — overrides the surface default. */
  color?: string;
  /** Explicit shadow — overrides the surface default. */
  shadow?: LuminaTextShadow;
}

const SHADOW_MAP: Record<Exclude<LuminaTextShadow, 'none'>, RNTextShadow> = {
  soft: shadows.textSoft,
  text: shadows.text,
  strong: shadows.textStrong,
};

export function LuminaText({ token = 'body', color, shadow, style, ...rest }: LuminaTextProps) {
  const surface = useSurface();

  const resolvedColor =
    color ?? (surface === 'light' ? colors.onSurface.primary : colors.text.primary);
  const resolvedShadow: LuminaTextShadow = shadow ?? (surface === 'light' ? 'none' : 'text');

  return (
    <Text
      {...rest}
      style={[
        typography[token] as TextStyle,
        { color: resolvedColor },
        resolvedShadow === 'none' ? null : SHADOW_MAP[resolvedShadow],
        style,
      ]}
    />
  );
}
