// Pulsing dot + mm:ss countdown — job offers and desk alerts. Magenta is the
// alert voice (never mixed with cyan in the same small component).

import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { colors } from '../theme';
import { MonoText } from './Typography';

export interface CountdownBadgeProps {
  secondsLeft: number;
  color?: string;
}

export function formatCountdown(s: number): string {
  const clamped = Math.max(0, Math.floor(s));
  return `${Math.floor(clamped / 60)}:${String(clamped % 60).padStart(2, '0')}`;
}

export function CountdownBadge({ secondsLeft, color = colors.magenta }: CountdownBadgeProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 12, height: 12 }}>
        <Animated.View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 6,
            backgroundColor: color,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.9] }) }],
          }}
        />
        <View style={{ position: 'absolute', inset: 1, borderRadius: 5, backgroundColor: color }} />
      </View>
      <MonoText bold size={16} color={color === colors.magenta ? colors.magentaText : color}>
        {formatCountdown(secondsLeft)}
      </MonoText>
    </View>
  );
}
