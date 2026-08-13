// Sign in — phone OTP only (CLAUDE.md: no Google, no social providers).
// Reference implementation of the Lumina Glass kit: mesh-gradient container
// with ambient orbs, haloed glass cards, carved phone well with a country
// bubble, jewel feature rows, gradient CTA pinned to the bottom.
//
// Live against Supabase phone auth. Flow: enter number -> "Send me a code"
// dispatches a real SMS -> six wells capture the code -> verify. There is no
// navigation on success: the auth gate in App.tsx swaps the navigator once
// the session lands, so this screen never decides where the user goes next.

import { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_DIAL_CODE, TAGLINE } from '@safeco/shared';
import { sendPhoneOtp, verifyPhoneOtp } from '@safeco/shared/auth';
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

const CODE_LENGTH = 6;
// Dial code comes from the shared constant, never a literal here — hardcoding
// one country's prefix silently mangles every number from anywhere else.
const PHONE_PREFIX = `+${DEFAULT_DIAL_CODE}`;
// Shortest national number worth attempting to send. PNG mobile numbers are
// 8 digits; this only guards the button, the server does real validation.
const MIN_NATIONAL_DIGITS = 7;

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

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      // Pass the raw field value: toE164 applies the default dial code only
      // when the user has not typed one, so "+675 8312 2058" does not become
      // "+675+67583122058". The prefix bubble is display, not data.
      await sendPhoneOtp(phone);
      setStage('code');
      setCode('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setError(null);
    setBusy(true);
    try {
      await verifyPhoneOtp(phone, value);
      // No navigation here — the auth gate reacts to the new session.
    } catch (e) {
      setError((e as Error).message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  // Verify as soon as the sixth digit lands, the way a code screen should
  // behave — no extra confirm tap.
  useEffect(() => {
    if (stage === 'code' && code.length === CODE_LENGTH && !busy) {
      void verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stage]);

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
                editable={!busy}
                style={{ marginTop: spacing.md }}
              />
            </GlassCard>
          ) : (
            <GlassCard>
              <Text style={{ ...typography.overline, color: colors.onSurface.muted }}>
                Verification code
              </Text>

              {/* The six wells are the visual; a transparent input over them
                  owns the keyboard and the real value. */}
              <View style={{ position: 'relative', marginTop: spacing.md }}>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={CODE_LENGTH}
                  autoFocus
                  editable={!busy}
                  accessibilityLabel="Verification code"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: WELL_SIZE,
                    opacity: 0,
                    zIndex: 2,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
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
                          code.length === i ? colors.glass.borderFocusTeal : colors.surface.border,
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
                        {code[i] ?? ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text
                style={{
                  ...typography.caption,
                  color: colors.onSurface.muted,
                  marginTop: spacing.md,
                }}
              >
                {busy
                  ? 'Checking your code'
                  : `Sent to ${PHONE_PREFIX} ${phone}`}
              </Text>
            </GlassCard>
          )}

          {/* Failures are shown in place — never a silent no-op on tap. */}
          {error ? (
            <View style={{ marginTop: spacing.md }}>
              <GlassCard>
                <Text style={{ ...typography.overline, color: colors.accent.rose }}>
                  Could not continue
                </Text>
                <Text
                  style={{
                    ...typography.body,
                    color: colors.onSurface.secondary,
                    marginTop: spacing.xs,
                  }}
                >
                  {error}
                </Text>
              </GlassCard>
            </View>
          ) : null}

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
            onPress={send}
            loading={busy}
            disabled={busy || phone.replace(/\D/g, '').length < MIN_NATIONAL_DIGITS}
            accessibilityLabel="Send me a code"
          />
        ) : (
          <NeuButton
            variant="secondary"
            title="Use a different number"
            onPress={() => {
              setStage('phone');
              setCode('');
              setError(null);
            }}
            disabled={busy}
            accessibilityLabel="Use a different number"
          />
        )}
      </Animated.View>
    </ScreenContainer>
  );
}
