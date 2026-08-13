// First sign-in only: capture the rider's name.
//
// Required, not optional decoration — profiles.name is NOT NULL, and this is
// the name the driver and the Office see ("Amara O. · Go"). A phone number in
// that slot would read as a broken record on the desk.
//
// Shown by the auth gate whenever a session exists with no profile row, so it
// also covers a user whose profile creation failed part-way and who reopens
// the app later.

import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCustomerProfile, signOut, useAuth } from '@safeco/shared/auth';
import { colors, shadows, spacing, typography } from '@safeco/shared/lumina';
import { GlassCard, InsetInput, NeuButton, ScreenContainer } from '@safeco/shared/ui';

const MIN_NAME = 2;

export function FirstRunNameScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await createCustomerProfile(name);
      // No navigation: the auth gate moves to the app once the profile lands.
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      style={{
        paddingTop: insets.top + spacing['2xl'],
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing['2xl'],
      }}
    >
      <Text style={{ ...typography.overline, color: colors.text.muted, ...shadows.textSoft }}>
        {phone ? `Verified · ${phone}` : 'Verified'}
      </Text>
      <Text
        style={{
          ...typography.h1,
          color: colors.text.primary,
          ...shadows.textStrong,
          marginTop: spacing.sm,
        }}
      >
        What should we call you?
      </Text>
      <Text
        style={{
          ...typography.body,
          color: colors.text.secondary,
          marginTop: spacing.sm,
        }}
      >
        Your driver and the Office see this name when they pick you up.
      </Text>

      <View style={{ marginTop: spacing.xl }}>
        <GlassCard>
          <Text style={{ ...typography.overline, color: colors.onSurface.muted }}>Your name</Text>
          <InsetInput
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            accessibilityLabel="Your name"
            editable={!busy}
            style={{ marginTop: spacing.md }}
          />
        </GlassCard>
      </View>

      {error ? (
        <View style={{ marginTop: spacing.md }}>
          <GlassCard>
            <Text style={{ ...typography.overline, color: colors.accent.rose }}>
              Could not save your name
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

      <View style={{ marginTop: 'auto' }}>
        <NeuButton
          title="Continue"
          onPress={submit}
          loading={busy}
          disabled={busy || name.trim().length < MIN_NAME}
          accessibilityLabel="Continue"
        />
        <NeuButton
          variant="secondary"
          title="Sign out"
          onPress={() => void signOut()}
          disabled={busy}
          accessibilityLabel="Sign out"
          style={{ marginTop: spacing.md }}
        />
      </View>
    </ScreenContainer>
  );
}
