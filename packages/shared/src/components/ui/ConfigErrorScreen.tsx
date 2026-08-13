// LUMINA GLASS UI — ConfigErrorScreen. Shown instead of the app when startup
// configuration is missing or wrong (currently: Supabase env vars).
//
// This exists because the alternative is worse: an unconfigured app renders
// normally and then fails with an opaque 401 at the first query, or crashes at
// import time with a raw red box. A developer seeing this screen should know
// what is missing and what to do about it without reading source.

import { ScrollView, View } from 'react-native';
import { colors, radius, spacing } from '../../lumina';
import { GlassCard } from './GlassCard';
import { LuminaText } from './LuminaText';
import { ScreenContainer } from './ScreenContainer';

export interface ConfigErrorScreenProps {
  /** Which app is misconfigured, e.g. "Customer app". */
  app: string;
  /** The actionable message — typically the thrown Error's message. */
  message: string;
}

export function ConfigErrorScreen({ app, message }: ConfigErrorScreenProps) {
  return (
    <ScreenContainer style={{ padding: spacing.lg, justifyContent: 'center' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <LuminaText token="overline" color={colors.accent.rose} shadow="soft">
          {app} · not configured
        </LuminaText>
        <LuminaText token="h2" shadow="strong" style={{ marginTop: spacing.sm }}>
          Startup configuration is missing
        </LuminaText>
        <View style={{ marginTop: spacing.xl }}>
          <GlassCard>
            <LuminaText token="body" color={colors.onSurface.secondary}>
              {message}
            </LuminaText>
            <View
              style={{
                marginTop: spacing.lg,
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: colors.surface.well,
              }}
            >
              <LuminaText token="caption" color={colors.onSurface.muted}>
                This screen replaces the app only when configuration is absent. It is not shown to
                riders, drivers or the Office.
              </LuminaText>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
