// Receipt — reviewing screen, details only. Every line traces to a quote the
// customer saw and accepted: the locked fare, any confirmed add-stop
// amendment as its own line, and the tip. Lumina Glass: itemised ledger on a
// GlassCard (mono figures right-aligned), price promise card with its badge.

import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatClock,
  formatDate,
  formatDistance,
  formatDuration,
  formatMoney,
} from '@safeco/shared';
import { borders, colors, shadows, spacing } from '@safeco/shared/lumina';
import { BrandWordmark, MonoText, useAppState, useSync } from '@safeco/shared/components';
import { GlassBadge, GlassCard, LuminaText, NeuButton, ScreenContainer, RecordMissingScreen } from '@safeco/shared/ui';
import type { ScreenProps } from '../navigation';

const FIGURE_SIZE = 15;

// Rendered inside the ledger GlassCard (light surface): ink text, ink
// separators. MonoText is context-blind, so its ink is explicit — primary
// for the strong figures, secondary for the quiet italic tip row.
function LedgerRow({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: borders.hairline,
        borderBottomColor: colors.surface.separator,
      }}
    >
      <LuminaText
        token="body"
        color={colors.onSurface.secondary}
        style={[{ flex: 1 }, italic ? { fontStyle: 'italic' } : null]}
      >
        {label}
      </LuminaText>
      <MonoText
        size={FIGURE_SIZE}
        color={italic ? colors.onSurface.secondary : colors.onSurface.primary}
        bold={!italic}
        style={[{ textAlign: 'right' }, italic ? { fontStyle: 'italic' } : null]}
      >
        {value}
      </MonoText>
    </View>
  );
}

export function ReceiptScreen({ navigation, route }: ScreenProps<'Receipt'>) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const job = useAppState((s) => s.jobs.find((j) => j.id === jobId));
  const sync = useSync();

  if (!job) {
    return (
      <RecordMissingScreen
        loading={sync.status === 'loading'}
        noun="receipt"
        error={sync.error}
        onBack={() => navigation.popToTop()}
      />
    );
  }

  const f = job.quotedFare;
  const amendments = job.amendments ?? [];
  const distance = formatDistance(job.route);
  const duration = formatDuration(job.route);
  // updatedAt is maintained by the DB trigger, so for a completed job it is
  // the moment it completed.
  const completedAt = job.status === 'completed' ? formatClock(job.updatedAt) : '';

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing['2xl'],
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BrandWordmark size={23} color={colors.text.primary} style={{ ...shadows.textStrong }}>
          SAFECO
        </BrandWordmark>
        <LuminaText token="overline" color={colors.text.muted} shadow="soft" style={{ marginTop: spacing.sm }}>
          Request {job.number} · {formatDate(job.createdAt)}
        </LuminaText>

        <LuminaText token="h2" style={{ marginTop: spacing['2xl'] }}>
          Fare, itemised
        </LuminaText>

        {/* Itemised ledger on a glass card */}
        <View style={{ marginTop: spacing.md }}>
          <GlassCard padding="lg">
            {/* Distance and time are CHARGE LINES. They now read from the
                route the quote was built from, so the label and the figure
                beside it always describe the same journey — previously they
                were hardcoded "4.2 km / 12 min" on every receipt. */}
            <LedgerRow label="Base" value={formatMoney(f.base)} />
            <LedgerRow
              label={distance ? `Distance · ${distance}` : 'Distance'}
              value={formatMoney(f.distance)}
            />
            <LedgerRow
              label={duration ? `Time · ${duration}` : 'Time'}
              value={formatMoney(f.time)}
            />
            <LedgerRow label="City levy" value={formatMoney(f.cityLevy)} />
            {amendments.map((a) => (
              <LedgerRow
                key={a.confirmedAt}
                label={`Stop at ${a.stop.address}`}
                value={`+${formatMoney(Math.round((a.newTotal - a.previousTotal) * 100) / 100)}`}
              />
            ))}
            {f.tip ? <LedgerRow label="Tip" value={formatMoney(f.tip)} italic /> : null}

            {/* Total row — the h2 moment of the ledger */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingVertical: spacing.md }}>
              <LuminaText token="h3" style={{ flex: 1 }}>
                Total
              </LuminaText>
              <LuminaText token="h2">{formatMoney(f.total)}</LuminaText>
            </View>
            {/* No payment provider exists yet, so this must not claim a card
                was charged. Stating the amount as payable is the honest
                version until payments land; inventing "Visa · 4417 — charged
                9:42" on a receipt is the kind of fiction that becomes a
                dispute. */}
            <LuminaText token="caption" color={colors.onSurface.muted}>
              Payable to your driver{completedAt ? ` · trip ended ${completedAt}` : ''}
            </LuminaText>

            {/* The promise is about these figures, so it stays on the same
                card — divided by a hairline, not split into a second card. */}
            <View
              style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTopWidth: borders.hairline,
                borderTopColor: colors.surface.separator,
              }}
            >
              <GlassBadge tone="primary">PRICE PROMISE</GlassBadge>
              <LuminaText
                token="body"
                color={colors.onSurface.secondary}
                style={{ marginTop: spacing.sm }}
              >
                Quoted before booking. Charged exactly as quoted plus your tip. Any difference is
                on us.
              </LuminaText>
            </View>
          </GlassCard>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 'auto', paddingTop: spacing['2xl'] }}>
          {/* The PDF button did nothing. There is no document generator and no
              file sharing, so it is gone rather than sitting dead — a receipt
              screen is exactly where someone taps expecting a real artefact. */}
          <NeuButton
            title="Done"
            onPress={() => navigation.popToTop()}
            accessibilityLabel="Done"
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
