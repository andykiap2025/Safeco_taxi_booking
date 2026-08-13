// LUMINA GLASS UI — AccessDeniedScreen. Shown when someone is signed in
// correctly but holds the wrong role for this app.
//
// Staff apps cannot offer a "create your account" step the way the customer
// app does: RLS restricts self-signup to role='customer' and a trigger blocks
// promotion, so a rider signing into the driver app has no legitimate path
// forward from inside the app. The honest response is to say so, name who can
// fix it, and offer the way out — not a spinner or an empty queue.

import { Text, View } from 'react-native';
import { colors, shadows, spacing, typography } from '../../lumina';
import { GlassCard } from './GlassCard';
import { NeuButton } from './NeuButton';
import { ScreenContainer } from './ScreenContainer';

export interface AccessDeniedScreenProps {
  /** Which app is refusing, e.g. "Safeco Driver". */
  app: string;
  /** Role this app requires, in the user's language: "a driver account". */
  requires: string;
  /** The role they actually have, if known. */
  currentRole?: string;
  onSignOut: () => void;
}

export function AccessDeniedScreen({
  app,
  requires,
  currentRole,
  onSignOut,
}: AccessDeniedScreenProps) {
  return (
    <ScreenContainer style={{ padding: spacing.lg, justifyContent: 'center' }}>
      <Text style={{ ...typography.overline, color: colors.accent.rose, ...shadows.textSoft }}>
        {app}
      </Text>
      <Text
        style={{
          ...typography.h1,
          color: colors.text.primary,
          ...shadows.textStrong,
          marginTop: spacing.sm,
        }}
      >
        This account can't sign in here
      </Text>

      <View style={{ marginTop: spacing.xl }}>
        <GlassCard>
          <Text style={{ ...typography.body, color: colors.onSurface.secondary }}>
            {app} needs {requires}
            {currentRole ? `, and this number is registered as a ${currentRole}` : ''}. The Office
            sets up accounts — ask them to add this number, then sign in again.
          </Text>
        </GlassCard>
      </View>

      <NeuButton
        variant="secondary"
        title="Sign out"
        onPress={onSignOut}
        accessibilityLabel="Sign out"
        style={{ marginTop: spacing.xl }}
      />
    </ScreenContainer>
  );
}
