// Customer-app local UI bits, Lumina Glass edition: the mock route, ghost
// text button, plate chip, safety shield + overlay, and small SVG glyphs.
// Every color comes from the lumina tokens (no raw literals); rose is the
// safety/alert voice — no teal inside a safety surface.

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { RouteEstimate } from '@safeco/shared';
import { borders, colors, radius, spacing, touchTarget } from '@safeco/shared/lumina';
import { GlassModal, LuminaText, withOpacity } from '@safeco/shared/ui';

// The one route used throughout the mock flow: 14 Kingsway → 8 Rowan St.
export const ROUTE: RouteEstimate = { distanceKm: 4.2, durationMin: 12 };

// Detour for the add-stop priced amendment (Rowan St Market).
export const STOP_DETOUR: RouteEstimate = { distanceKm: 1.1, durationMin: 4 };

// Local alpha tuning (token + alpha via withOpacity only).
const PLATE_BORDER_ALPHA = 0.35;
const SHIELD_BORDER_ALPHA = 0.6;

// ─── Ghost text button — a bare button-token pressable ──────────────────────
// Surface-aware: no color/shadow defaults, so the SurfaceContext picks ink on
// light sheets and white-with-shadow on the gradient. Pass `color` to tint.

export interface GhostButtonProps {
  title: string;
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function GhostButton({ title, onPress, color, style }: GhostButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[{ minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <LuminaText token="button" color={color}>
        {title}
      </LuminaText>
    </Pressable>
  );
}

// ─── Plate chip — registration on a light card ──────────────────────────────
// Lives inside GlassCards (light surface): ink border, context-ink text.

export function PlateChip({ plate, style }: { plate: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          borderWidth: borders.glass,
          borderColor: withOpacity(colors.onSurface.primary, PLATE_BORDER_ALPHA),
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
        style,
      ]}
    >
      <LuminaText token="listTitle" style={{ letterSpacing: 1 }}>
        {plate}
      </LuminaText>
    </View>
  );
}

// ─── Glyphs ─────────────────────────────────────────────────────────────────

export function ShieldIcon({ size = 22, color = colors.accent.rose }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.5l7.5 2.8v5.9c0 4.7-3.2 8.1-7.5 10.3C7.7 19.3 4.5 15.9 4.5 11.2V5.3L12 2.5z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export function ShareIcon({ size = 20, color = colors.accent.rose }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7.5 11.4l8.4-4.2M7.5 12.6l8.4 4.2" stroke={color} strokeWidth={1.6} />
      <Circle cx={6} cy={12} r={2.7} fill={color} />
      <Circle cx={18} cy={6.4} r={2.7} fill={color} />
      <Circle cx={18} cy={17.6} r={2.7} fill={color} />
    </Svg>
  );
}

export function StarIcon({ size = 26, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z"
        fill={color}
      />
    </Svg>
  );
}

// ─── Safety (rose voice — no teal inside) ───────────────────────────────────

// 48dp light square shield entry point: rose border + rose glyph. The fill
// matches the kit's light icon tiles so it reads on the gradient AND on the
// white sheets it sits beside.
export function SafetyShield({ onPress, style }: { onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Safety tools"
      onPress={onPress}
      style={[
        {
          width: touchTarget,
          height: touchTarget,
          borderRadius: radius.iconButton,
          backgroundColor: colors.surface.buttonSecondary,
          borderWidth: borders.glass,
          borderColor: withOpacity(colors.accent.rose, SHIELD_BORDER_ALPHA),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <ShieldIcon />
    </Pressable>
  );
}

const SAFETY_ROWS = [
  'Call emergency services',
  'Share live trip with a contact',
  'Report an issue to the Office',
] as const;

export function SafetyOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  // The GlassModal sheet is a light surface: context ink for plain rows,
  // rose stays the safety accent, separators in ink.
  return (
    <GlassModal visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <ShieldIcon size={18} />
        <LuminaText token="overline" color={colors.accent.rose}>
          Safety
        </LuminaText>
      </View>
      <LuminaText token="h2" style={{ marginTop: spacing.sm }}>
        You're covered
      </LuminaText>
      <View style={{ marginTop: spacing.sm }}>
        {SAFETY_ROWS.map((label, i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onClose}
            style={{
              minHeight: touchTarget,
              justifyContent: 'center',
              borderBottomWidth: i === SAFETY_ROWS.length - 1 ? 0 : borders.hairline,
              borderBottomColor: colors.surface.separator,
            }}
          >
            <LuminaText token="listTitle" color={i === 0 ? colors.accent.rose : undefined}>
              {label}
            </LuminaText>
          </Pressable>
        ))}
      </View>
      <GhostButton
        title="Close"
        color={colors.onSurface.muted}
        onPress={onClose}
        style={{ marginTop: spacing.sm }}
      />
    </GlassModal>
  );
}
