// Brand row + desk stats, shared by both layouts. "The Office" voice: the
// operator's name and ward on desk — the word "dispatch" never appears in copy.
// Lumina Glass: serif lives ONLY in the BrandWordmark; every other string is a
// LuminaText token. Stats sit in a GlassCard; WAITING flips rose when > 0.

import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@safeco/shared/lumina';
import { BrandWordmark, useAppState } from '@safeco/shared/components';
import { GlassCard, LuminaText } from '@safeco/shared/ui';
import { queuedJobs } from '../lib/candidates';

export interface DeskHeaderProps {
  style?: StyleProp<ViewStyle>;
}

// Teal status dot beside the on-desk line — small jewel, radius.full circle.
const STATUS_DOT = spacing.sm;

// One desk stat: h2 value over an overline label (the old StatBlock, spoken
// in Lumina tokens). Lives inside the white stats GlassCard, so values take
// the surface-aware ink default; `valueColor` only overrides for alerts.
function Stat({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <LuminaText token="h2" color={valueColor}>
        {value}
      </LuminaText>
      <LuminaText token="overline" color={colors.onSurface.muted}>
        {label}
      </LuminaText>
    </View>
  );
}

export function DeskHeader({ style }: DeskHeaderProps) {
  const dispatcher = useAppState((s) => s.dispatcher);
  const stats = useAppState((s) => s.stats);
  const jobs = useAppState((s) => s.jobs);
  const waitingCount = queuedJobs(jobs).length;

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
        <BrandWordmark
          size={typography.h2.fontSize}
          color={colors.text.primary}
          style={{ ...shadows.textStrong }}
        >
          SAFECO
        </BrandWordmark>
        <LuminaText token="h3">Office</LuminaText>
      </View>

      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}
      >
        <View
          style={{
            width: STATUS_DOT,
            height: STATUS_DOT,
            borderRadius: radius.full,
            backgroundColor: colors.primary.light,
          }}
        />
        <LuminaText token="bodySmall" color={colors.text.muted} shadow="soft">
          {dispatcher.ward} · {dispatcher.name} · on desk
        </LuminaText>
      </View>

      {/* Margin lives on the wrapper so the card's halo stays centered. */}
      <View style={{ marginTop: spacing.md }}>
        <GlassCard style={{ flexDirection: 'row', gap: spacing.lg }}>
          <Stat value={String(stats.carsFree)} label="Cars free" />
          <Stat
            value={String(waitingCount)}
            label="Waiting"
            valueColor={waitingCount > 0 ? colors.accent.rose : undefined}
          />
          <Stat value={`${stats.avgAssignSeconds}s`} label="Avg assign" />
          <Stat value={String(stats.assignedToday)} label="Today" />
        </GlassCard>
      </View>
    </View>
  );
}
