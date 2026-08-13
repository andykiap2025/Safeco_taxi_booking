// Tests for the tier-aware assignment rules.
//
// These encode desk policy and cost control: which cars may be offered for a
// job, and when Safeco gives away a bigger car at the smaller car's price.
// Getting the upgrade rule wrong costs money on every occurrence.

import { describe, expect, it } from 'vitest';
import { UPGRADE_AT_QUOTE } from '../constants';
import type { JobRequest, Vehicle } from '../types';
import { isMismatch, requiredSeats, upgradeCandidateTier, vehiclesForTier } from './assignment';

const vehicle = (id: string, tier: Vehicle['tier'], seats: number): Vehicle => ({
  id,
  tier,
  seats,
  make: 'Toyota',
  model: 'Corolla',
  colour: 'Silver',
  plate: id.toUpperCase(),
});

const job = (over: Partial<JobRequest> = {}): JobRequest => ({
  id: 'job-1',
  number: 40121,
  customerId: 'cust-1',
  tier: 'go',
  pickup: { address: 'Boroko' },
  dropoff: { address: 'Airport' },
  quotedFare: { base: 4.5, distance: 6, time: 2.15, cityLevy: 0.7, total: 13.35, currency: 'PGK' },
  status: 'at_desk',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  ...over,
});

const FLEET = [
  vehicle('share-1', 'share', 2),
  vehicle('go-1', 'go', 4),
  vehicle('go-2', 'go', 4),
  vehicle('xl-1', 'xl', 6),
];

describe('vehiclesForTier', () => {
  it('offers only the tier the customer asked for', () => {
    expect(vehiclesForTier(FLEET, 'go').map((v) => v.id)).toEqual(['go-1', 'go-2']);
    expect(vehiclesForTier(FLEET, 'xl').map((v) => v.id)).toEqual(['xl-1']);
  });

  it('returns nothing rather than a near-match when the tier is empty', () => {
    expect(vehiclesForTier([vehicle('go-1', 'go', 4)], 'xl')).toEqual([]);
  });
});

describe('isMismatch', () => {
  it('flags a car from a different tier', () => {
    expect(isMismatch(vehicle('xl-1', 'xl', 6), job({ tier: 'go' }))).toBe(true);
    expect(isMismatch(vehicle('go-1', 'go', 4), job({ tier: 'go' }))).toBe(false);
  });
});

describe('requiredSeats', () => {
  it('uses the stated party size when there is one', () => {
    expect(requiredSeats(job({ tier: 'share', partySize: 4 }))).toBe(4);
  });

  it('falls back to the requested tier capacity, not to one', () => {
    // The conservative proxy: assume the party fills the tier they chose.
    // Defaulting to a single passenger would offer a 2-seat Share car to a
    // group who booked an XL.
    expect(requiredSeats(job({ tier: 'xl' }))).toBe(6);
    expect(requiredSeats(job({ tier: 'go' }))).toBe(4);
  });
});

describe('upgradeCandidateTier — free upgrades cost real money', () => {
  const overThreshold = UPGRADE_AT_QUOTE.waitThresholdSeconds + 1;
  const underThreshold = UPGRADE_AT_QUOTE.waitThresholdSeconds - 1;

  it('does not upgrade on a momentary shortage', () => {
    expect(upgradeCandidateTier(job({ tier: 'go' }), underThreshold)).toBeNull();
    expect(upgradeCandidateTier(job({ tier: 'go' }), 0)).toBeNull();
  });

  it('upgrades exactly one tier, never further', () => {
    const next = upgradeCandidateTier(job({ tier: 'share' }), overThreshold);
    expect(next?.id).toBe('go'); // not 'xl'
  });

  it('offers nothing above the top tier', () => {
    // Degrade to quoting a longer wait instead.
    expect(upgradeCandidateTier(job({ tier: 'xl' }), overThreshold)).toBeNull();
  });

  it('refuses an upgrade that seats fewer than the party', () => {
    // The capacity rule: tier rank picks the candidate, the seat count gates
    // the offer. It must never assume tiers are ordered by capacity.
    const bigParty = job({ tier: 'share', partySize: 6 });
    expect(upgradeCandidateTier(bigParty, overThreshold)).toBeNull();
  });

  it('allows an upgrade that does seat the party', () => {
    const smallParty = job({ tier: 'share', partySize: 2 });
    expect(upgradeCandidateTier(smallParty, overThreshold)?.id).toBe('go');
  });

  it('honours the configured threshold rather than a hardcoded one', () => {
    // Ops tune this; the rule must follow the constant.
    expect(upgradeCandidateTier(job({ tier: 'go' }), UPGRADE_AT_QUOTE.waitThresholdSeconds)).not.toBeNull();
  });

  it('moves exactly maxTiersUp steps', () => {
    expect(UPGRADE_AT_QUOTE.maxTiersUp).toBe(1);
  });
});
