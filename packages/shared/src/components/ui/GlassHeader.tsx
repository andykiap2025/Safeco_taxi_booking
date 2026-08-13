// LUMINA GLASS UI — GlassHeader. Safe-area-aware glass app bar: 64dp row,
// absolutely-centered h3 title (so left/right slots never push it off
// center), glass fill + standard elevated shadow.

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows, spacing, typography } from '../../lumina';

export interface GlassHeaderProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

const BAR_HEIGHT = spacing['4xl']; // 64dp per spec

export function GlassHeader({ title, left, right }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        // Sits on the GRADIENT — stays translucent glass, brightened to the
        // white-0.10 fill (v3); title stays white with its text shadow.
        backgroundColor: colors.glass.fillHover,
        ...shadows.elevated,
      }}
    >
      <View
        style={{
          height: BAR_HEIGHT,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Centered title layer sits underneath the edge slots. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              ...typography.h3,
              color: colors.text.primary,
              ...shadows.text,
              maxWidth: '60%',
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
        </View>
        <View>{left}</View>
        <View>{right}</View>
      </View>
    </View>
  );
}
