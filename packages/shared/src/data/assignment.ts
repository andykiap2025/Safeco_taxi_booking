// Tier-aware assignment rules (CLAUDE.md "Tier-aware assignment").
// The desk never has to remember which vehicle belongs to which tier.

import { TIERS, UPGRADE_AT_QUOTE } from '../constants';
import { tierById } from './fare';
import type { JobRequest, Vehicle } from '../types';

// Default assignment list: only vehicles of the requested tier.
export function vehiclesForTier(vehicles: Vehicle[], tierId: JobRequest['tier']): Vehicle[] {
  return vehicles.filter((v) => v.tier === tierId);
}

// Choosing outside the requested tier is allowed only through the explicit
// override flow — the dispatcher must acknowledge this mismatch.
export function isMismatch(vehicle: Vehicle, job: JobRequest): boolean {
  return vehicle.tier !== job.tier;
}

// Capacity rule (2026-08-12): seat check gates every upgrade offer; party
// size unknown → conservative proxy = requested tier's seat count.
export function requiredSeats(job: JobRequest): number {
  return job.partySize ?? tierById(job.tier).seats;
}

// Upgrade-at-quote eligibility: wait past the configurable threshold, exactly
// one tier up, seats must cover the party. Per-account rate limiting and
// instance logging are backend-enforced (see supabase/schema.sql upgrade_log).
export function upgradeCandidateTier(job: JobRequest, waitSeconds: number) {
  if (waitSeconds < UPGRADE_AT_QUOTE.waitThresholdSeconds) return null;
  const current = tierById(job.tier);
  const next = TIERS.find((t) => t.sortOrder === current.sortOrder + UPGRADE_AT_QUOTE.maxTiersUp);
  if (!next) return null; // top tier — degrade to quoting a longer wait
  if (next.seats < requiredSeats(job)) return null;
  return next;
}
