// LUMINA GLASS UI — GlassModal. Transparent RN Modal hosting a bottom
// sheet: backdrop fade + sheet slide-up on present (durations.entrance),
// reversed on dismiss (durations.base). The sheet is an elevated GlassCard
// with 2xl top corners and the standard 36×4 grab handle.

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { colors, durations, radius, spacing } from '../../lumina';
import { GlassCard } from './GlassCard';
import { withOpacity } from './util';

export interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  children?: ReactNode;
}

// Grab handle — the one spec-sanctioned inline literal (36×4dp pill).
// v3: ink at 0.25 — the sheet is a light surface now.
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
const HANDLE_ALPHA = 0.25;

export function GlassModal({ visible, onClose, children }: GlassModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: durations.entrance,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: durations.base,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [windowHeight, 0],
  });

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.backdrop,
            opacity: progress,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY }] }}>
          <GlassCard
            variant="elevated"
            borderRadius="2xl"
            style={{
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingBottom: spacing['2xl'],
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: HANDLE_WIDTH,
                height: HANDLE_HEIGHT,
                borderRadius: radius.full,
                backgroundColor: withOpacity(colors.onSurface.primary, HANDLE_ALPHA),
                marginBottom: spacing.lg,
              }}
            />
            {children}
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
}
