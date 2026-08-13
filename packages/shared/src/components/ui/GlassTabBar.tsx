// LUMINA GLASS UI — GlassTabBar. Glass strip with a light top hairline.
// The active tab reads in primary.light with a 4dp teal dot beneath it —
// the dot carries a small GlowHalo, the Android-safe colored glow.

import type { ReactNode } from 'react';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, Pressable, Text, View } from 'react-native';
import {
  borders,
  colors,
  pressIn,
  pressOut,
  pressScale,
  radius,
  shadows,
  spacing,
  touchTarget,
  typography,
} from '../../lumina';
import { GlowHalo } from './GlowHalo';
import { withOpacity } from './util';

export interface GlassTab {
  key: string;
  label: string;
  icon?: ReactNode;
}

export interface GlassTabBarProps {
  tabs: GlassTab[];
  activeKey: string;
  onTab: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

const BAR_HEIGHT = spacing['4xl']; // 64dp — comfortably over the touch target
const DOT_SIZE = spacing.xs; // 4dp active dot
const TOP_HAIRLINE_ALPHA = 0.1;

function TabItem({
  tab,
  active,
  onTab,
}: {
  tab: GlassTab;
  active: boolean;
  onTab: (key: string) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const color = active ? colors.primary.light : colors.text.muted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={() => onTab(tab.key)}
      onPressIn={() => pressIn(scale, pressScale.icon).start()}
      onPressOut={() => pressOut(scale).start()}
      style={{ flex: 1, minHeight: touchTarget }}
    >
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          transform: [{ scale }],
        }}
      >
        {typeof tab.icon === 'string' ? (
          <Text style={{ ...typography.body, color, ...shadows.textSoft }}>{tab.icon}</Text>
        ) : (
          tab.icon
        )}
        <Text style={{ ...typography.caption, color, ...shadows.textSoft }}>{tab.label}</Text>
        <View style={{ width: DOT_SIZE, height: DOT_SIZE }}>
          {active ? (
            <View
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: radius.full,
                backgroundColor: colors.primary.base,
              }}
            >
              <GlowHalo color={shadows.halo.teal} radius={radius.full} spread={spacing.xs} />
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function GlassTabBar({ tabs, activeKey, onTab, style }: GlassTabBarProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          minHeight: BAR_HEIGHT,
          // Sits on the GRADIENT — stays translucent glass, brightened to
          // the white-0.10 fill (v3); labels stay white with shadows.
          backgroundColor: colors.glass.fillHover,
          borderTopWidth: borders.hairline,
          borderTopColor: withOpacity(colors.text.primary, TOP_HAIRLINE_ALPHA),
        },
        style,
      ]}
    >
      {tabs.map((tab) => (
        <TabItem key={tab.key} tab={tab} active={tab.key === activeKey} onTab={onTab} />
      ))}
    </View>
  );
}
