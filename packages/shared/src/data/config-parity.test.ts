// The database prices rides; the app quotes them for display. Both must agree.
//
// book_ride() rejects a booking when the client's figure differs from the
// server's, so drift is never charged silently — but it WOULD block every
// booking with "the fare changed, please try again". That is a safe failure,
// not an acceptable one.
//
// This reads the seeded values straight out of supabase/schema.sql and compares
// them to the constants the apps quote from, so the two cannot drift unnoticed.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FARE_RATES, ROUTE_ESTIMATE, TIERS } from '../constants';

const schema = readFileSync(
  join(__dirname, '..', '..', '..', '..', 'supabase', 'schema.sql'),
  'utf8',
);

describe('schema.sql fare config matches the app constants', () => {
  it('seeds fare_config with the same rates the apps quote from', () => {
    const row = schema.match(
      /insert into fare_config[\s\S]*?values \(true,([^)]*)\)/,
    );
    expect(row, 'fare_config seed not found in schema.sql').toBeTruthy();

    const parts = row![1].split(',').map((s) => s.trim().replace(/'/g, ''));
    const [base, perKm, perMin, cityLevy, roundStep, currency, roadFactor, speed, minKm] = parts;

    expect(Number(base)).toBe(FARE_RATES.base);
    expect(Number(perKm)).toBe(FARE_RATES.perKm);
    expect(Number(perMin)).toBe(FARE_RATES.perMin);
    expect(Number(cityLevy)).toBe(FARE_RATES.cityLevy);
    expect(Number(roundStep)).toBe(FARE_RATES.roundStep);
    expect(currency).toBe(FARE_RATES.currency);
    expect(Number(roadFactor)).toBe(ROUTE_ESTIMATE.roadFactor);
    expect(Number(speed)).toBe(ROUTE_ESTIMATE.averageSpeedKmh);
    expect(Number(minKm)).toBe(ROUTE_ESTIMATE.minimumDistanceKm);
  });

  it('seeds tier_rates with the same tiers, seats and multipliers', () => {
    const block = schema.match(/insert into tier_rates[\s\S]*?values\s*([\s\S]*?)on conflict/);
    expect(block, 'tier_rates seed not found in schema.sql').toBeTruthy();

    const rows = [...block![1].matchAll(/\('([a-z]+)',\s*([\d]+),\s*([\d.]+),\s*([\d]+)\)/g)].map(
      (m) => ({ id: m[1], seats: Number(m[2]), multiplier: Number(m[3]), sortOrder: Number(m[4]) }),
    );

    expect(rows.length, 'tier count differs from TIERS').toBe(TIERS.length);
    for (const tier of TIERS) {
      const row = rows.find((r) => r.id === tier.id);
      expect(row, `tier "${tier.id}" is missing from schema.sql`).toBeTruthy();
      expect(row!.seats, `${tier.id} seats`).toBe(tier.seats);
      expect(row!.multiplier, `${tier.id} fare multiplier`).toBe(tier.fareMultiplier);
      expect(row!.sortOrder, `${tier.id} sort order`).toBe(tier.sortOrder);
    }
  });

  it('keeps booking behind the server-priced RPC', () => {
    // If a direct-insert policy on jobs ever comes back, a client can name its
    // own fare again and every other guard here becomes decorative.
    expect(schema).toContain('drop policy if exists "customers book own jobs" on jobs;');
    expect(schema).not.toMatch(/create policy "customers book own jobs" on jobs for insert/);
  });
});
