// LUMINA GLASS UI — InlineError. The standard way a failed action reports
// itself, in place, on the screen that triggered it.
//
// Exists because the mock store could not fail, so no screen had anywhere to
// put a failure. With a network behind every action, "nothing happened when I
// tapped" is the worst possible outcome — a user cannot tell a dropped
// connection from a broken app. Rose is the alert voice (never teal here).

import { Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lumina';
import { GlassCard } from './GlassCard';

export interface InlineErrorProps {
  /** What the user was trying to do: "Could not book your ride". */
  title: string;
  /** The underlying message. Shown verbatim — it is usually the only clue. */
  message: string;
  /** Rendered under the message, e.g. a retry button. */
  action?: React.ReactNode;
  style?: React.ComponentProps<typeof View>['style'];
}

export function InlineError({ title, message, action, style }: InlineErrorProps) {
  return (
    <View style={style} accessible accessibilityRole="alert">
      <GlassCard>
        <Text style={{ ...typography.overline, color: colors.accent.rose }}>{title}</Text>
        <Text
          style={{
            ...typography.body,
            color: colors.onSurface.secondary,
            marginTop: spacing.xs,
          }}
        >
          {message}
        </Text>
        {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
      </GlassCard>
    </View>
  );
}
