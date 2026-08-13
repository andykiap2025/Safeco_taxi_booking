// Office sign in — phone OTP, same as every Safeco app.
//
// Runs on the dispatcher's phone AND in the desk's browser, so it stays a
// single centred column rather than adopting the wide two-pane layout.
//
// No sign-up path: dispatcher accounts are provisioned, so an unknown number
// verifies and then meets AccessDeniedScreen.

import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_DIAL_CODE } from '@safeco/shared';
import { sendPhoneOtp, verifyPhoneOtp } from '@safeco/shared/auth';
import {
  borders,
  colors,
  radius,
  shadows,
  spacing,
  touchTarget,
  typography,
} from '@safeco/shared/lumina';
import { BrandWordmark } from '@safeco/shared/components';
import {
  GlassCard,
  InlineError,
  InsetInput,
  NeuButton,
  ScreenContainer,
  withOpacity,
} from '@safeco/shared/ui';

const CODE_LENGTH = 6;
const PHONE_PREFIX = `+${DEFAULT_DIAL_CODE}`;
const MIN_NATIONAL_DIGITS = 7;
const WELL_SIZE = touchTarget - spacing.sm;
const CARVE_TOP_ALPHA = 0.15;
// The desk runs on a wide monitor; the form should not stretch across it.
const COLUMN_MAX = 420;

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
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
    } catch (e) {
      setError((e as Error).message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (stage === 'code' && code.length === CODE_LENGTH && !busy) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stage]);

  return (
    <ScreenContainer
      style={{
        paddingTop: insets.top + spacing['2xl'],
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: COLUMN_MAX }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <BrandWordmark
            size={typography.brand.fontSize}
            color={colors.text.primary}
            style={{ ...shadows.textStrong }}
          >
            SAFECO
          </BrandWordmark>
          <Text style={{ ...typography.h3, color: colors.text.primary, ...shadows.textSoft }}>
            Office
          </Text>
        </View>
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            ...shadows.textSoft,
            marginTop: spacing.sm,
          }}
        >
          Sign in to take the desk.
        </Text>

        <View style={{ marginTop: spacing.xl }}>
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
              <View style={{ position: 'relative', marginTop: spacing.md }}>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                  keyboardType="number-pad"
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
                {busy ? 'Checking your code' : `Sent to ${PHONE_PREFIX} ${phone}`}
              </Text>
            </GlassCard>
          )}
        </View>

        {error ? (
          <InlineError
            title="Could not sign you in"
            message={error}
            style={{ marginTop: spacing.md }}
          />
        ) : null}

        <View style={{ marginTop: spacing.xl }}>
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
        </View>
      </View>
    </ScreenContainer>
  );
}
