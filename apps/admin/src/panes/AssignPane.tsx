// Assign a driver + car to one request. Tier-aware by default: the list shows
// only vehicles of the job's tier (vehiclesForTier); choosing outside the tier
// goes through the explicit mismatch acknowledgment; an empty tier falls back
// to the office default — upgrade-at-quote when the shared policy allows it
// (upgradeCandidateTier), otherwise quote a longer wait.
//
// Shared verbatim by the wide console (right pane, keyed by job id) and the
// narrow stack (full Assign screen). `onClose` is "leave this job": Hold, or
// the driver confirming the offer.
//
// Lumina Glass (white-surface pass): candidate rows are white jewels with a
// teal radio (teal = selection; primary.base so it reads on white); mismatch
// flags and the live wait speak rose (magenta's old duties); the
// acknowledgment card is rose-tinted white glass with an ink check — never
// teal on the rose card; the upgrade fallback is an ELEVATED GlassCard
// wearing the violet office-default badge.

import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  UPGRADE_AT_QUOTE,
  formatMoney,
  mockStore,
  tierById,
  upgradeCandidateTier,
} from '@safeco/shared';
import {
  borders,
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '@safeco/shared/lumina';
import { MapPlate, MonoText, formatCountdown, useMockState } from '@safeco/shared/components';
import {
  GlassBadge,
  GlassCard,
  GlassGroup,
  LuminaText,
  NeuButton,
  SurfaceProvider,
  useGroup,
  withOpacity,
} from '@safeco/shared/ui';
import { candidatesForTier, freeCandidates, type Candidate } from '../lib/candidates';

export interface AssignPaneProps {
  jobId: string;
  onClose: () => void;
}

type SelectionKind = 'match' | 'mismatch' | 'upgrade';

interface Selection {
  driverId: string;
  vehicleId: string;
  kind: SelectionKind;
}

// Radio glyph geometry — ring from spacing.lg, dot one step down.
const RADIO_SIZE = spacing.lg;
const RADIO_DOT = spacing.sm;
// Mismatch acknowledgment: checkbox well and the rose card tint.
const CHECKBOX_SIZE = spacing.lg + borders.button;
const ACK_TINT_ALPHA = 0.12;
// Rows dim to half strength once the offer is sent.
const DISABLED_OPACITY = 0.5;
// The map stays a strip — this pane is details-dominant.
const MAP_STRIP_HEIGHT = 150;
// Selected rows tint teal at 10% under a teal left bar — a full focus border
// cannot work mid-group, so the bar carries the selection instead.
const SELECTED_FILL_ALPHA = 0.1;
const SELECTED_BAR = 3;

// Radio on the white jewel: primary.base teal (light is weak on white),
// placeholder-ink ring when unselected.
function RadioGlyph({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: RADIO_SIZE,
        height: RADIO_SIZE,
        borderRadius: radius.full,
        borderWidth: borders.button,
        borderColor: selected ? colors.primary.base : colors.onSurface.placeholder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected ? (
        <View
          style={{
            width: RADIO_DOT,
            height: RADIO_DOT,
            borderRadius: radius.full,
            backgroundColor: colors.primary.base,
          }}
        />
      ) : null}
    </View>
  );
}

interface CandidateRowProps {
  candidate: Candidate;
  selected: boolean;
  disabled?: boolean;
  flagged?: boolean; // different tier than the job requested
  last?: boolean;
  onPress: () => void;
}

function CandidateRow({ candidate, selected, disabled, flagged, last, onPress }: CandidateRowProps) {
  const { driver, vehicle, etaMinutes } = candidate;
  const paddingH = useGroup()?.rowPaddingH ?? 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: touchTarget,
        paddingHorizontal: paddingH,
        paddingVertical: spacing.lg,
        backgroundColor: selected
          ? withOpacity(colors.primary.light, SELECTED_FILL_ALPHA)
          : pressed
            ? colors.surface.cardPressed
            : 'transparent',
        opacity: disabled ? DISABLED_OPACITY : 1,
      })}
    >
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: SELECTED_BAR,
            backgroundColor: colors.primary.base,
          }}
        />
      ) : null}
      <SurfaceProvider value="light">
        <RadioGlyph selected={selected} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {flagged ? (
            <LuminaText
              token="caption"
              color={colors.accent.rose}
              style={{ textTransform: 'uppercase', marginBottom: spacing.xs / 2 }}
            >
              Different tier · {tierById(vehicle.tier).name}
            </LuminaText>
          ) : null}
          <LuminaText token="listTitle" color={colors.onSurface.primary}>
            {driver.name} · {driver.rating.toFixed(2)}
          </LuminaText>
          <LuminaText
            token="listSubtitle"
            color={colors.onSurface.muted}
            style={{ marginTop: spacing.xs / 2 }}
          >
            {vehicle.colour} {vehicle.make} {vehicle.model} · {vehicle.plate}
          </LuminaText>
        </View>
        <MonoText color={colors.onSurface.secondary}>{etaMinutes} min</MonoText>
      </SurfaceProvider>
      {last ? null : (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: paddingH,
            right: paddingH,
            height: borders.hairline,
            backgroundColor: colors.surface.separator,
          }}
        />
      )}
    </Pressable>
  );
}

export function AssignPane({ jobId, onClose }: AssignPaneProps) {
  const state = useMockState((s) => s);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showOtherTiers, setShowOtherTiers] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sent, setSent] = useState(false);

  // The offer-confirm timer must finish its store work even if this pane
  // unmounts mid-flight; only the UI close is gated on being mounted.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Freeze the last known wait so the header stays sensible once the job
  // leaves the queue clocks (status "offered" while awaiting confirm).
  const lastWait = useRef(0);

  const job = state.jobs.find((j) => j.id === jobId);
  if (!job) return null;

  const rawWait: number | undefined = state.waits[jobId];
  if (rawWait !== undefined) lastWait.current = rawWait;
  const waitSeconds = rawWait ?? lastWait.current;

  const jobTier = tierById(job.tier);
  const fare = formatMoney(job.quotedFare.total, job.quotedFare.currency);

  const all = freeCandidates(state, job);
  const sameTier = candidatesForTier(all, job.tier);
  const otherTiers = all.filter((c) => c.mismatch);

  // No-vehicle fallback: only consulted when the tier-filtered list is empty.
  const upgradeTier = sameTier.length === 0 ? upgradeCandidateTier(job, waitSeconds) : null;
  const upgradeCands = upgradeTier ? all.filter((c) => c.vehicle.tier === upgradeTier.id) : [];

  const selectedCandidate = selection
    ? all.find((c) => c.driver.id === selection.driverId && c.vehicle.id === selection.vehicleId) ?? null
    : null;

  const select = (c: Candidate, kind: SelectionKind) => {
    if (sent) return;
    setSelection({ driverId: c.driver.id, vehicleId: c.vehicle.id, kind });
    setAcknowledged(false);
  };

  const needsAck = selection?.kind === 'mismatch';
  const canAssign = !!selection && !sent && (!needsAck || acknowledged);

  const assign = () => {
    if (!selection || sent) return;
    mockStore.offerJob(
      job.id,
      selection.driverId,
      selection.vehicleId,
      selection.kind === 'upgrade' ? { upgradeApplied: true } : undefined,
    );
    setSent(true);
    // Simulated driver: confirms after ~4s, then the job leaves the queue.
    setTimeout(() => {
      mockStore.driverConfirm(job.id);
      if (mounted.current) onClose();
    }, 4000);
  };

  const assignTitle = sent
    ? 'Sent · awaiting confirm'
    : selectedCandidate
      ? `Assign ${selectedCandidate.driver.name.split(' ')[0]}`
      : 'Assign';

  const renderFallback = () => {
    if (upgradeTier) {
      return (
        <View style={{ marginTop: spacing.md }}>
          <GlassCard variant="elevated">
            <GlassBadge tone="violet">Office default · Upgrade at quote</GlassBadge>
            <LuminaText style={{ marginTop: spacing.md }}>
              No free {jobTier.name}. Send a {upgradeTier.name} at the {jobTier.name} price — {fare}{' '}
              unchanged. Logged for cost review.
            </LuminaText>
            {upgradeCands.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                {upgradeCands.map((c, i) => (
                  <CandidateRow
                    key={c.driver.id}
                    candidate={c}
                    selected={selection?.driverId === c.driver.id && selection.vehicleId === c.vehicle.id}
                    disabled={sent}
                    last={i === upgradeCands.length - 1}
                    onPress={() => select(c, 'upgrade')}
                  />
                ))}
              </View>
            ) : (
              <LuminaText
                token="listSubtitle"
                color={colors.onSurface.muted}
                style={{ marginTop: spacing.md }}
              >
                No free {upgradeTier.name} right now either — quote a longer wait.
              </LuminaText>
            )}
          </GlassCard>
        </View>
      );
    }
    return (
      <View style={{ marginTop: spacing.md }}>
        <GlassCard>
          <LuminaText token="overline" color={colors.onSurface.muted}>
            No cars free
          </LuminaText>
          <LuminaText style={{ marginTop: spacing.sm }}>
            Quote a longer wait in {jobTier.name} — upgrades unlock after{' '}
            {UPGRADE_AT_QUOTE.waitThresholdSeconds / 60} min waiting.
          </LuminaText>
        </GlassCard>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <LuminaText token="h2">Assign {job.number}</LuminaText>
        <LuminaText token="overline" color={colors.accent.rose} shadow="soft">
          {formatCountdown(waitSeconds)} waiting
        </LuminaText>
      </View>

      <LuminaText style={{ marginTop: spacing.sm }}>
        {job.customerId} · {jobTier.name} · {fare} fixed
      </LuminaText>
      <LuminaText color={colors.text.secondary} style={{ marginTop: spacing.xs }}>
        {job.pickup.address} → {job.dropoff.address}
      </LuminaText>
      {job.noteToDriver ? (
        <LuminaText color={colors.text.muted} style={{ marginTop: spacing.xs, fontStyle: 'italic' }}>
          “{job.noteToDriver}”
        </LuminaText>
      ) : null}

      <MapPlate
        height={MAP_STRIP_HEIGHT}
        car
        label="free cars near pickup"
        style={{
          marginTop: spacing.md,
          borderRadius: radius.lg,
          borderWidth: borders.hairline,
          borderColor: colors.glass.border,
        }}
      />

      <LuminaText token="overline" color={colors.text.muted} shadow="soft" style={{ marginTop: spacing.xl }}>
        Choose driver & car
      </LuminaText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginTop: spacing.sm,
        }}
      >
        <GlassBadge tone="primary">
          {`${jobTier.name} vehicles · ${sameTier.length} free`.toUpperCase()}
        </GlassBadge>
        <Pressable
          onPress={() => setShowOtherTiers((v) => !v)}
          accessibilityRole="button"
          style={{ minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: spacing.xs }}
        >
          <LuminaText token="button" color={colors.primary.light} shadow="soft">
            {showOtherTiers ? 'Hide other tiers' : 'Show other tiers'}
          </LuminaText>
        </Pressable>
      </View>

      {sameTier.length === 0 ? renderFallback() : null}

      {/* One list in one container: revealing other tiers EXTENDS this group
          rather than starting a second stack of cards. */}
      {sameTier.length > 0 || (showOtherTiers && otherTiers.length > 0) ? (
        <GlassGroup style={{ marginTop: spacing.md }}>
          {sameTier.map((c, i) => (
            <CandidateRow
              key={c.driver.id}
              candidate={c}
              selected={selection?.driverId === c.driver.id && selection.vehicleId === c.vehicle.id}
              disabled={sent}
              last={i === sameTier.length - 1 && !(showOtherTiers && otherTiers.length > 0)}
              onPress={() => select(c, 'match')}
            />
          ))}
          {showOtherTiers
            ? otherTiers.map((c, i) => (
                <CandidateRow
                  key={c.driver.id}
                  candidate={c}
                  flagged
                  selected={
                    selection?.driverId === c.driver.id && selection.vehicleId === c.vehicle.id
                  }
                  disabled={sent}
                  last={i === otherTiers.length - 1}
                  onPress={() => select(c, 'mismatch')}
                />
              ))
            : null}
        </GlassGroup>
      ) : null}

      {showOtherTiers && otherTiers.length === 0 ? (
        <LuminaText
          token="listSubtitle"
          color={colors.text.muted}
          shadow="soft"
          style={{ marginTop: spacing.sm }}
        >
          No free cars in other tiers right now.
        </LuminaText>
      ) : null}

      {needsAck && selectedCandidate ? (
        <View style={{ marginTop: spacing.md }}>
          {/* Rose-tinted acknowledgment — ink check on the light card, never
              teal here. */}
          <GlassCard style={{ backgroundColor: withOpacity(colors.accent.rose, ACK_TINT_ALPHA) }}>
            <LuminaText>
              This is a {tierById(selectedCandidate.vehicle.tier).name} car on a {jobTier.name} job.
              The fare stays {fare} as quoted.
            </LuminaText>
            <Pressable
              onPress={() => setAcknowledged((v) => !v)}
              disabled={sent}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: touchTarget,
                marginTop: spacing.xs,
              }}
            >
              <View
                style={{
                  width: CHECKBOX_SIZE,
                  height: CHECKBOX_SIZE,
                  borderWidth: borders.button,
                  borderColor: colors.onSurface.primary,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: acknowledged ? colors.onSurface.primary : 'transparent',
                }}
              >
                {acknowledged ? (
                  <MonoText bold size={typography.caption.fontSize} color={colors.text.primary}>
                    ✓
                  </MonoText>
                ) : null}
              </View>
              <LuminaText token="listTitle">Acknowledge tier mismatch</LuminaText>
            </Pressable>
          </GlassCard>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <NeuButton variant="secondary" title="Hold" onPress={onClose} style={{ flex: 1 }} />
        <NeuButton
          title={assignTitle}
          onPress={assign}
          disabled={!sent && !canAssign}
          loading={sent}
          accessibilityLabel={assignTitle}
          style={{ flex: 2 }}
        />
      </View>
    </ScrollView>
  );
}
