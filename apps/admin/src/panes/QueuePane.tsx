// The queue: every request that needs a car, the runs in progress, and the
// shift ledger. Shared verbatim by the wide console (selection lifted to the
// parent) and the narrow stack (selection navigates to the Assign screen).
// Lumina Glass (white-surface pass): queue rows are white jewels
// (GlassListItem anatomy — surface.card fill, 1.5dp surface.border edge,
// 16dp radius, 12dp gaps, ink text); the selected row (wide layout) takes
// the teal focus border + a faint teal tint — teal is the desk-tool
// selection voice. Overdue wait timers speak rose, which reads on white.

import { Pressable, ScrollView, View } from 'react-native';
import { QUEUE_WAIT_FLAG_SECONDS, formatMoney, tierById } from '@safeco/shared';
import type { JobRequest } from '@safeco/shared';
import { borders, colors, spacing, touchTarget } from '@safeco/shared/lumina';
import { MonoText, formatCountdown, useMockState } from '@safeco/shared/components';
import {
  GlassGroup,
  GlassListItem,
  LuminaText,
  NeuButton,
  SurfaceProvider,
  useGroup,
  withOpacity,
} from '@safeco/shared/ui';
import { queuedJobs, runningJobs } from '../lib/candidates';
import { useQueueTick } from '../lib/useQueueTick';

export interface QueuePaneProps {
  selectedJobId?: string;
  onSelectJob: (jobId: string) => void;
}

interface QueueRowProps {
  job: JobRequest;
  waitSeconds: number;
  selected: boolean;
  onPress: () => void;
  last: boolean;
}

// Selected rows tint teal at 10% under a teal left bar — a full focus border
// cannot work mid-group, so the bar carries the selection instead.
const SELECTED_FILL_ALPHA = 0.1;
const SELECTED_BAR = 3;

function QueueRow({ job, waitSeconds, selected, onPress, last }: QueueRowProps) {
  const tier = tierById(job.tier);
  const overdue = waitSeconds > QUEUE_WAIT_FLAG_SECONDS;
  const paddingH = useGroup()?.rowPaddingH ?? 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <MonoText bold color={colors.onSurface.secondary}>
              {job.number}
            </MonoText>
            <LuminaText token="listTitle" color={colors.onSurface.primary} numberOfLines={1}>
              {job.customerId} · {tier.name}
            </LuminaText>
          </View>
          <LuminaText
            token="listSubtitle"
            color={colors.onSurface.muted}
            numberOfLines={1}
            style={{ marginTop: spacing.xs / 2 }}
          >
            {job.pickup.address} → {job.dropoff.address}
          </LuminaText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <MonoText bold color={colors.onSurface.secondary}>
            {formatMoney(job.quotedFare.total, job.quotedFare.currency)}
          </MonoText>
          <MonoText
            color={overdue ? colors.accent.rose : colors.onSurface.muted}
            style={{ marginTop: spacing.xs / 2 }}
          >
            {formatCountdown(waitSeconds)}
          </MonoText>
        </View>
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

export function QueuePane({ selectedJobId, onSelectJob }: QueuePaneProps) {
  useQueueTick();
  const jobs = useMockState((s) => s.jobs);
  const waits = useMockState((s) => s.waits);
  const drivers = useMockState((s) => s.drivers);
  const dispatcher = useMockState((s) => s.dispatcher);
  const stats = useMockState((s) => s.stats);

  const queued = queuedJobs(jobs);
  const running = runningJobs(jobs);

  const assignOldest = () => {
    if (queued.length === 0) return;
    const oldest = [...queued].sort((a, b) => (waits[b.id] ?? 0) - (waits[a.id] ?? 0))[0];
    onSelectJob(oldest.id);
  };

  const driverName = (id?: string) => drivers.find((d) => d.id === id)?.name ?? '—';

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.lg }}
    >
      {queued.length === 0 ? (
        <View>
          <LuminaText token="overline" color={colors.text.muted} shadow="soft">
            Queue clear
          </LuminaText>
          <LuminaText color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
            Every request has a car. New bookings land here the moment they reach the desk.
          </LuminaText>
        </View>
      ) : (
        <View>
          <GlassGroup title="Needs a car">
            {queued.map((job, i) => (
              <QueueRow
                key={job.id}
                job={job}
                waitSeconds={waits[job.id] ?? 0}
                selected={job.id === selectedJobId}
                onPress={() => onSelectJob(job.id)}
                last={i === queued.length - 1}
              />
            ))}
          </GlassGroup>
          <NeuButton
            title="Assign oldest request"
            onPress={assignOldest}
            style={{ marginTop: spacing.xl, alignSelf: 'flex-start' }}
          />
        </View>
      )}

      {running.length > 0 ? (
        <GlassGroup title="Running" style={{ marginTop: spacing['2xl'] }}>
          {running.map((job, i) => (
            <GlassListItem
              key={job.id}
              title={`${job.customerId} → ${job.dropoff.address}`}
              subtitle={`${driverName(job.assignedDriverId)} · ${
                job.status === 'arriving' ? 'arriving' : 'on trip'
              }`}
              icon={
                <MonoText bold color={colors.onSurface.secondary}>
                  {job.number}
                </MonoText>
              }
              last={i === running.length - 1}
            />
          ))}
        </GlassGroup>
      ) : null}

      <View style={{ marginTop: spacing['2xl'] }}>
        <LuminaText token="overline" color={colors.text.muted} shadow="soft">
          Shift {dispatcher.shiftStart ?? '—'}–{dispatcher.shiftEnd ?? '—'}
        </LuminaText>
        <LuminaText
          token="caption"
          color={colors.text.muted}
          shadow="soft"
          style={{ marginTop: spacing.xs }}
        >
          {stats.assignedToday} assigned today · {stats.returnedToday} returned to queue
        </LuminaText>
      </View>
    </ScrollView>
  );
}
