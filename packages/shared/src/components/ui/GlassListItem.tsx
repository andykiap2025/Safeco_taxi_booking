// LUMINA GLASS UI — GlassListItem. v4 (grouping directive): a row is a ROW,
// not a card. It carries no fill, border, radius or shadow of its own —
// related rows stack flush inside one GlassGroup (or one GlassCard) and are
// divided by a hairline separator. v3's one-jewel-per-row treatment is
// retired: a column of individual cards reads as N unrelated things and eats
// vertical space that the content needs.
//
// Anatomy: leading 40dp rounded-square icon tile in faint ink with a 20dp
// tinted glyph, title + subtitle, trailing node (chevron by default when
// pressable). Dark ink text, no text shadows — the row always sits on a light
// surface. Horizontal inset comes from GroupContext; a row dropped straight
// into an already-padded GlassCard adds none. The separator is inset to the
// title's left edge (past the icon tile) and to the group inset on the right,
// matching the card-internal separators used elsewhere in the app. Press
// feedback tints the full row edge to edge — no slide, which reads as broken
// inside a grouped list. `selected` adds a teal tint plus a teal left bar
// (teal is the selection voice; a full border cannot work mid-group).

import type { ReactNode } from 'react';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, Pressable, Text, View } from 'react-native';
import { borders, colors, durations, radius, spacing, touchTarget, typography } from '../../lumina';
import { useGroup } from './GroupContext';
import { SurfaceProvider } from './SurfaceContext';
import { withOpacity } from './util';

export interface GlassListItemProps {
  title: string;
  subtitle?: string;
  /** Icon node rendered inside the leading 40dp tile. Strings are wrapped in
   * a 20dp Text tinted `iconColor`. */
  icon?: ReactNode;
  /** Tint for string icons (default primary.base — reads on white). */
  iconColor?: string;
  /** Background for the icon tile (default ink at 5%). */
  iconBackground?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Last row in its group — drops the separator. */
  last?: boolean;
  /** Selected row: teal tint + teal left bar. */
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const ICON_TILE = touchTarget - spacing.sm; // 40dp rounded square
const ICON_GLYPH = spacing.lg + spacing.xs; // 20dp glyph
const TILE_FILL_ALPHA = 0.05; // faint ink tile on the white surface
const TILE_GAP = spacing.md; // icon → text
const ROW_PADDING_V = spacing.lg; // 16dp; minHeight still guards the 48dp target
// Selection: teal tint under a teal left bar.
const SELECTED_FILL_ALPHA = 0.1;
const SELECTED_BAR = 3;
const DISABLED_OPACITY = 0.5;

export function GlassListItem({
  title,
  subtitle,
  icon,
  iconColor = colors.primary.base,
  iconBackground,
  trailing,
  onPress,
  last = false,
  selected = false,
  disabled = false,
  style,
  accessibilityLabel,
}: GlassListItemProps) {
  const group = useGroup();
  const paddingH = group?.rowPaddingH ?? 0;
  const press = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue: number) =>
    Animated.timing(press, {
      toValue,
      duration: durations.instant,
      useNativeDriver: false, // backgroundColor interpolation
    }).start();

  const restingFill = selected
    ? withOpacity(colors.primary.light, SELECTED_FILL_ALPHA)
    : 'transparent';
  const pressedFill = press.interpolate({
    inputRange: [0, 1],
    outputRange: [restingFill, colors.surface.cardPressed],
  });

  // Separator runs from the title's left edge to the group's right inset.
  const separatorLeft = paddingH + (icon !== undefined ? ICON_TILE + TILE_GAP : 0);

  const content = (
    <Animated.View
      style={{
        minHeight: touchTarget,
        paddingHorizontal: paddingH,
        paddingVertical: ROW_PADDING_V,
        backgroundColor: onPress && !disabled ? pressedFill : restingFill,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: disabled ? DISABLED_OPACITY : 1,
      }}
    >
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: SELECTED_BAR,
            backgroundColor: colors.primary.base,
          }}
        />
      ) : null}

      {icon !== undefined ? (
        <View
          style={{
            width: ICON_TILE,
            height: ICON_TILE,
            borderRadius: radius.md,
            backgroundColor:
              iconBackground ?? withOpacity(colors.onSurface.primary, TILE_FILL_ALPHA),
            borderWidth: borders.hairline,
            borderColor: colors.surface.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: TILE_GAP,
          }}
        >
          {typeof icon === 'string' ? (
            <SurfaceProvider value="light">
              <Text style={{ fontSize: ICON_GLYPH, color: iconColor }}>{icon}</Text>
            </SurfaceProvider>
          ) : (
            <SurfaceProvider value="light">{icon}</SurfaceProvider>
          )}
        </View>
      ) : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ ...typography.listTitle, color: colors.onSurface.primary }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{ ...typography.listSubtitle, color: colors.onSurface.muted }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing !== undefined ? (
        <SurfaceProvider value="light">{trailing}</SurfaceProvider>
      ) : onPress ? (
        <Text style={{ ...typography.h3, color: colors.onSurface.muted }}>{'›'}</Text>
      ) : null}

      {/* Divider to the next row in the group. */}
      {last ? null : (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: separatorLeft,
            right: paddingH,
            height: borders.hairline,
            backgroundColor: colors.surface.separator,
          }}
        />
      )}
    </Animated.View>
  );

  if (!onPress || disabled) {
    return <View style={style}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      style={style}
    >
      {content}
    </Pressable>
  );
}
