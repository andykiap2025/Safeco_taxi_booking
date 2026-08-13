// LUMINA GLASS UI — InsetInput. v3 (white-surface directive): a grey well
// (surface.well) carved into a LIGHT card — dark ink text, ink-tinted
// carve lines (1px black-ish inside the top edge, near-white inside the
// bottom edge; Android cannot draw real inset shadows). Focus keeps the
// teal border (glass.borderFocusTeal) + teal GlowHalo; errors swap both to
// the error tones. The left slot is a country-code bubble in faint ink.

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardTypeOptions, StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Animated, Text, TextInput, View } from 'react-native';
import {
  borders,
  colors,
  durations,
  radius,
  shadows,
  spacing,
  touchTarget,
  typography,
} from '../../lumina';
import { GlowHalo } from './GlowHalo';
import { withOpacity } from './util';

/** Standard TextInput props forwarded straight through. Kept as an explicit
 *  list rather than `...TextInputProps` so the control's own styling contract
 *  (colours, height, carve) cannot be overridden from a call site. */
type ForwardedInputProps = Pick<
  TextInputProps,
  | 'editable'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'textContentType'
  | 'inputMode'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'secureTextEntry'
  | 'multiline'
>;

export interface InsetInputProps extends ForwardedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: boolean;
  /** Left slot — rendered inside a country-code bubble. Strings get the
   * bubble's bold white text treatment automatically. */
  leftIcon?: ReactNode;
  autoFocus?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  accessibilityLabel?: string;
}

// Control height per spec (56dp): minimum touch target + one small step.
const INPUT_HEIGHT = touchTarget + spacing.sm;
// Carve tuning on the light well: ink 0.15 top line, near-white 0.9 bottom.
const CARVE_TOP_ALPHA = 0.15;
const CARVE_BOTTOM_ALPHA = 0.9;
// Country bubble: faint ink fill (0.06) per v3 spec.
const BUBBLE_FILL_ALPHA = 0.06;
// Country bubble radius: 10dp per v2 spec (radius.md - 2).
const BUBBLE_RADIUS = radius.md - 2;

export function InsetInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error = false,
  leftIcon,
  autoFocus,
  maxLength,
  style,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...forwarded
}: InsetInputProps) {
  const [focused, setFocused] = useState(false);
  const haloOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(haloOpacity, {
      toValue: focused || error ? 1 : 0,
      duration: durations.fast,
      useNativeDriver: true,
    }).start();
  }, [focused, error, haloOpacity]);

  const borderColor = error
    ? colors.glass.borderError
    : focused
      ? colors.glass.borderFocusTeal
      : colors.surface.border;

  return (
    <View style={[{ position: 'relative' }, style]}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: haloOpacity,
        }}
      >
        <GlowHalo
          color={error ? shadows.halo.error : shadows.halo.tealFocus}
          radius={radius.input}
          spread={spacing.md}
        />
      </Animated.View>

      <View
        style={{
          height: INPUT_HEIGHT,
          borderRadius: radius.input,
          backgroundColor: colors.surface.well,
          borderWidth: borders.glass,
          borderColor,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          overflow: 'hidden',
        }}
      >
        {/* Carved relief: dark line inside the top edge… */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: radius.input / 2,
            right: radius.input / 2,
            height: borders.hairline,
            backgroundColor: withOpacity(colors.onSurface.primary, CARVE_TOP_ALPHA),
          }}
        />
        {/* …light line inside the bottom edge. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: radius.input / 2,
            right: radius.input / 2,
            height: borders.hairline,
            backgroundColor: withOpacity(colors.text.primary, CARVE_BOTTOM_ALPHA),
          }}
        />

        {leftIcon != null ? (
          <View
            style={{
              backgroundColor: withOpacity(colors.onSurface.primary, BUBBLE_FILL_ALPHA),
              borderRadius: BUBBLE_RADIUS,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.sm,
            }}
          >
            {typeof leftIcon === 'string' ? (
              <Text style={{ ...typography.listTitle, color: colors.onSurface.primary }}>
                {leftIcon}
              </Text>
            ) : (
              leftIcon
            )}
          </View>
        ) : null}

        <TextInput
          {...forwarded}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          accessibilityLabel={accessibilityLabel ?? placeholder}
          underlineColorAndroid="transparent"
          placeholderTextColor={colors.onSurface.placeholder}
          selectionColor={colors.primary.light}
          cursorColor={colors.primary.light}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            ...typography.input,
            // A field that cannot be typed in must not look identical to one
            // that can — this is the only visual cue while a request is in
            // flight.
            color:
              forwarded.editable === false
                ? colors.onSurface.muted
                : colors.onSurface.primary,
            paddingVertical: 0,
          }}
        />
      </View>
    </View>
  );
}
