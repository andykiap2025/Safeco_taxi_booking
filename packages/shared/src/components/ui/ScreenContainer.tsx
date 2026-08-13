// LUMINA GLASS UI — ScreenContainer. Every screen's base layer: deep
// background guard color, the signature indigo→violet→teal mesh gradient,
// and two ambient light orbs. The orbs fake a blurred glow with stacked
// concentric circles at decreasing opacity (no blur filter exists in core
// RN, and Android has no colored shadows).

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StatusBar, View } from 'react-native';
import { colors, radius } from '../../lumina';

export interface ScreenContainerProps {
  /** Render the two ambient glow orbs (default true). */
  orbs?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

// Orb geometry per the v2 spec: violet ~280dp top-right, teal ~300dp
// bottom-left. The colors.orbs tokens already carry their alpha, so the
// stacked layers only shape the falloff.
const ORB_VIOLET = 280;
const ORB_TEAL = 300;
// Concentric layer opacities that approximate a radial blur falloff.
const ORB_LAYERS = [1, 0.6, 0.35] as const;

function Orb({
  size,
  color,
  position,
}: {
  size: number;
  color: string;
  position: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size }, position]}
    >
      {ORB_LAYERS.map((layerOpacity, i) => {
        const inset = (i * size) / (ORB_LAYERS.length * 2 + 2);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: inset,
              left: inset,
              right: inset,
              bottom: inset,
              borderRadius: radius.full,
              backgroundColor: color,
              opacity: layerOpacity,
            }}
          />
        );
      })}
    </View>
  );
}

export function ScreenContainer({ orbs = true, style, children }: ScreenContainerProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <LinearGradient
        colors={[colors.meshStart, colors.meshMid, colors.meshEnd] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {orbs ? (
        <>
          <Orb
            size={ORB_VIOLET}
            color={colors.orbs.violet}
            position={{ top: -ORB_VIOLET / 3, right: -ORB_VIOLET / 3 }}
          />
          <Orb
            size={ORB_TEAL}
            color={colors.orbs.teal}
            position={{ bottom: -ORB_TEAL / 3, left: -ORB_TEAL / 3 }}
          />
        </>
      ) : null}
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </View>
  );
}
