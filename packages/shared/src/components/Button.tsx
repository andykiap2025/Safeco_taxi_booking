// Primary embossed button — approach "A" (CLAUDE.md): outer shadow from the
// elevation scale, diagonal gradient agreeing with the top-left light source,
// 1px top highlight hairline. Pressing swaps to the `pressed` elevation level,
// inverts the gradient and nudges the label down-right, so the emboss
// physically depresses.
// React Native only — import from '@safeco/shared/components', never from the
// package root (the root stays platform-agnostic for the Admin web app).

import { useState } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, elevation, minTapTarget, radius, space, typography } from '../theme';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, disabled, style }: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const level = pressed ? elevation.pressed : elevation.raised;
  const stops: [string, string] = pressed
    ? [colors.accentDeep, colors.accentLight]
    : [colors.accentLight, colors.accentDeep];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[{ borderRadius: radius.md, opacity: disabled ? 0.45 : 1, ...level }, style]}
    >
      <LinearGradient
        colors={stops}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.md,
          minHeight: minTapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.gutter,
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: colors.embossHighlight }}
        />
        <Text
          style={{
            color: colors.white,
            fontSize: typography.size.emphasis,
            fontWeight: '600',
            transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
          }}
        >
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
