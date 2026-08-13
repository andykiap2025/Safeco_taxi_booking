// Sign in — phone OTP only (CLAUDE.md: no Google, no social providers).
// Reference implementation of the Lumina Glass kit (v2 physical pass):
// mesh-gradient container with ambient orbs, haloed glass cards, carved
// phone well with a country bubble, jewel feature rows, gradient CTA pinned
// to the bottom. Flow: "Send me a code" swaps the phone card for six code
// wells that the mock timer fills; a completed code replaces to Plan.

import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAGLINE } from '@safeco/shared';
import {
  borders,
  colors,
  entrance,
  radius,
  shadows,
  spacing,
  stagger,
  touchTarget,
  typography,
} from '@safeco/shared/lumina';
import { BrandWordmark } from '@safeco/shared/components';
import {
  GlassCard,
  GlassGroup,
  GlassListItem,
  GlowHalo,
  InsetInput,
  NeuButton,
  ScreenContainer,
  withOpacity,
} from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

const CODE = '417226';
const PHONE_PREFIX = '+1';
const MOCK_PHONE = '415 220 8841';
// Mock cadence (behaviour, not style): one digit per tick, brief hold at the
// end before the stack replaces to Plan.
const DIGIT_TICK_MS = 280;
const COMPLETE_HOLD_MS = 550;

// Logo tile: 72dp (4xl + sm) rounded square. The brand PNG has a white ground —
// presented as a deliberate white tile in the glass system. The artwork is
// square and uncropped, so it sits whole inside the tile (contain, no zoom).
const LOGO_TILE = spacing['4xl'] + spacing.sm;
const LOGO_SOURCE = require('../../assets/brand/logo-emblem.png');

// Code wells: 40dp squares (spec range 36–44) styled like mini InsetInputs.
const WELL_SIZE = touchTarget - spacing.sm;
// Carve tuning on the light well — mirrors InsetInput's v3 values (ink top
// line, near-white bottom line).
const CARVE_TOP_ALPHA = 0.15;
const CARVE_BOTTOM_ALPHA = 0.9;

// Feature rows — per-item icon tints per the v2 spec:
// teal fares / violet tracking / rose safety.
const VALUE_PROPS = [
  {
    icon: '$',
    title: 'Fixed fare before you book',
    subtitle: 'Quoted up front, itemised after',
    tint: colors.primary.base, // primary.light is too weak on the white jewel
  },
  {
    icon: '➤',
    title: 'Watch your driver coming',
    subtitle: 'Live on the map, door to door',
    tint: colors.accent.violet,
  },
  {
    icon: '+',
    title: 'Safety toolkit on every trip',
    subtitle: 'Trusted contacts and SOS',
    tint: colors.accent.rose,
  },
] as const;

export function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(MOCK_PHONE);
  const [digits, setDigits] = useState('');

  // Entrance stagger for the three main blocks: hero, cards, CTA.
  const blocks = useRef(
    [0, 1, 2].map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(stagger.translateY),
    })),
  ).current;

  useEffect(() => {
    Animated.parallel(
      blocks.map((b, i) => entrance(b.opacity, b.translateY, i * stagger.perChild)),
    ).start();
  }, [blocks]);

  // Mock OTP: the six wells fill themselves after a beat.
  useEffect(() => {
    if (stage !== 'code') return;
    const timer = setInterval(() => {
      setDigits((d) => (d.length < CODE.length ? CODE.slice(0, d.length + 1) : d));
    }, DIGIT_TICK_MS);
    return () => clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (digits.length !== CODE.length) return;
    const t = setTimeout(() => navigation.replace('Plan'), COMPLETE_HOLD_MS);
    return () => clearTimeout(t);
  }, [digits, navigation]);

  const blockStyle = (i: number) => ({
    opacity: blocks[i].opacity,
    transform: [{ translateY: blocks[i].translateY }],
  });

  return (
    <ScreenContainer
      style={{
        paddingTop: insets.top + spacing['2xl'],
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing['2xl'],
      }}
    >
      {/* Hero — logo tile, brand, overline, tagline, promise. */}
      <Animated.View style={blockStyle(0)}>
        {/* Emblem on its white tile, seated in the glass system: glass edge,
            elevated shadow, small violet halo behind. */}
        <View
          style={{
            width: LOGO_TILE,
            height: LOGO_TILE,
            marginBottom: spacing.md,
            position: 'relative',
          }}
        >
          <GlowHalo color={shadows.halo.cardGlow} radius={radius.input} spread={spacing.sm} />
          <View
            style={{
              width: LOGO_TILE,
              height: LOGO_TILE,
              borderRadius: radius.input,
              borderWidth: borders.glass,
              borderColor: colors.glass.border,
              overflow: 'hidden',
              ...shadows.elevated,
            }}
          >
            <Image
              source={LOGO_SOURCE}
              resizeMode="contain"
              accessible
              accessibilityLabel="Safeco Taxi Service logo"
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        </View>
        <BrandWordmark
          size={typography.brand.fontSize}
          color={colors.text.primary}
          style={{ ...shadows.textStrong }}
        >
          SAFECO
        </BrandWordmark>
        <Text
          style={{
            ...typography.overline,
            color: colors.text.muted,
            ...shadows.textSoft,
            marginTop: spacing.xs,
          }}
        >
          Taxi booking
        </Text>
        <Text
          style={{
            ...typography.tagline,
            color: colors.text.primary,
            ...shadows.text,
            marginTop: spacing.lg,
          }}
        >
          {TAGLINE}.
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            ...shadows.textSoft,
            marginTop: spacing.sm,
          }}
        >
          Every fare is quoted before you book, itemised after. No surge, ever.
        </Text>
      </Animated.View>

      {/* Middle — phone (or code) card + jewel feature rows, scrollable. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: spacing.xl, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={blockStyle(1)}>
          {stage === 'phone' ? (
            <GlassCard>
              <Text style={{ ...typography.overline, color: colors.onSurface.muted }}>
                Mobile number
              </Text>
              <InsetInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                accessibilityLabel="Mobile number"
                leftIcon={PHONE_PREFIX}
                style={{ marginTop: spacing.md }}
              />
            </GlassCard>
          ) : (
            <GlassCard>
              <Text style={{ ...typography.overline, color: colors.onSurface.muted }}>
                Verification code
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Verification code sent to ${PHONE_PREFIX} ${phone}`}
                onPress={() => setDigits(CODE)}
                style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}
              >
                {Array.from({ length: CODE.length }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: WELL_SIZE,
                      maxWidth: WELL_SIZE,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface.well,
                      borderWidth: borders.glass,
                      borderColor:
                        digits.length === i
                          ? colors.glass.borderFocusTeal
                          : colors.surface.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Mini carved relief, matching InsetInput v3. */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: radius.md / 2,
                        right: radius.md / 2,
                        height: borders.hairline,
                        backgroundColor: withOpacity(colors.onSurface.primary, CARVE_TOP_ALPHA),
                      }}
                    />
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: radius.md / 2,
                        right: radius.md / 2,
                        height: borders.hairline,
                        backgroundColor: withOpacity(colors.text.primary, CARVE_BOTTOM_ALPHA),
                      }}
                    />
                    <Text style={{ ...typography.h2, color: colors.onSurface.primary }}>
                      {digits[i] ?? ''}
                    </Text>
                  </View>
                ))}
              </Pressable>
              <Text
                style={{
                  ...typography.caption,
                  color: colors.onSurface.muted,
                  marginTop: spacing.md,
                }}
              >
                {digits.length === CODE.length ? 'Verified · opening' : 'Verifying automatically'}
              </Text>
            </GlassCard>
          )}

          {/* Why Safeco — one group, three flush rows, tinted icon tiles. */}
          <GlassGroup style={{ marginTop: spacing.md }}>
            {VALUE_PROPS.map((p, i) => (
              <GlassListItem
                key={p.title}
                icon={p.icon}
                iconColor={p.tint}
                title={p.title}
                subtitle={p.subtitle}
                last={i === VALUE_PROPS.length - 1}
              />
            ))}
          </GlassGroup>
        </Animated.View>
      </ScrollView>

      {/* CTA — pinned under the scroll area. */}
      <Animated.View style={blockStyle(2)}>
        {stage === 'phone' ? (
          <NeuButton
            title="Send me a code"
            onPress={() => setStage('code')}
            accessibilityLabel="Send me a code"
          />
        ) : null}
      </Animated.View>
    </ScreenContainer>
  );
}
