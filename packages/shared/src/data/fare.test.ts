// Tests for the fare engine.
//
// These cover commercial promises, not implementation detail. Every
// expectation here corresponds to something Safeco tells a customer: the fare
// is fixed, the receipt itemises it, a stop costs more not less, and a tier
// that seats more costs more.

import { describe, expect, it } from 'vitest';
import { FARE_RATES, ROUTE_ESTIMATE, TIERS } from '../constants';
import {
  amendedTotal,
  computeQuote,
  currencySymbol,
  estimateRoute,
  formatClock,
  formatDistance,
  formatDuration,
  formatMoney,
  tierById,
} from './fare';

const ROUTE = { distanceKm: 4.2, durationMin: 12 };

describe('computeQuote', () => {
  it('itemises to the total it charges', () => {
    // THE receipt promise: the lines a customer reads must add up to the
    // figure they are asked to pay. Checked across a wide spread of routes
    // and every tier, because rounding is where this breaks.
    for (const tier of TIERS) {
      for (let km = 0.5; km <= 40; km += 0.1) {
        for (const min of [3, 7, 12, 18, 25, 40, 65]) {
          const q = computeQuote({ distanceKm: Math.round(km * 10) / 10, durationMin: min }, tier.id);
          const itemised =
            Math.round((q.base + q.distance + q.time + q.cityLevy) * 100) / 100;
          expect(
            itemised,
            `${tier.id} ${km.toFixed(1)}km/${min}min: lines ${itemised} vs total ${q.total}`,
          ).toBe(q.total);
        }
      }
    }
  });

  it('prices a bigger tier above a smaller one for the same journey', () => {
    const share = computeQuote(ROUTE, 'share').total;
    const go = computeQuote(ROUTE, 'go').total;
    const xl = computeQuote(ROUTE, 'xl').total;
    expect(share).toBeLessThan(go);
    expect(go).toBeLessThan(xl);
  });

  it('charges more for a longer journey', () => {
    const near = computeQuote({ distanceKm: 2, durationMin: 6 }, 'go').total;
    const far = computeQuote({ distanceKm: 20, durationMin: 45 }, 'go').total;
    expect(far).toBeGreaterThan(near);
  });

  it('always includes the city levy', () => {
    const q = computeQuote(ROUTE, 'go');
    expect(q.cityLevy).toBe(FARE_RATES.cityLevy);
  });

  it('quotes in the configured currency', () => {
    expect(computeQuote(ROUTE, 'go').currency).toBe(FARE_RATES.currency);
  });

  it('lands every figure on the configured rounding step', () => {
    const q = computeQuote({ distanceKm: 7.3, durationMin: 19 }, 'xl');
    for (const n of [q.base, q.distance, q.time, q.total]) {
      const steps = n / FARE_RATES.roundStep;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
    }
  });

  it('rejects an unknown tier rather than quoting a default', () => {
    // Silently falling back to a tier would mis-price a ride.
    expect(() => tierById('limousine' as never)).toThrow();
  });
});

describe('amendedTotal', () => {
  it('never reduces a locked fare', () => {
    // Add-a-stop is the ONLY path allowed to change a locked fare, and it
    // exists to price extra distance. A detour must not make a ride cheaper.
    const base = computeQuote(ROUTE, 'go');
    for (const detour of [
      { distanceKm: 0.1, durationMin: 1 },
      { distanceKm: 1.1, durationMin: 4 },
      { distanceKm: 9, durationMin: 25 },
    ]) {
      expect(amendedTotal(base, detour, 'go')).toBeGreaterThan(base.total);
    }
  });

  it('charges the tier multiplier on the detour too', () => {
    const detour = { distanceKm: 5, durationMin: 12 };
    const goExtra = amendedTotal(computeQuote(ROUTE, 'go'), detour, 'go') - computeQuote(ROUTE, 'go').total;
    const xlExtra = amendedTotal(computeQuote(ROUTE, 'xl'), detour, 'xl') - computeQuote(ROUTE, 'xl').total;
    expect(xlExtra).toBeGreaterThan(goExtra);
  });
});

describe('estimateRoute', () => {
  const boroko = { lat: -9.464, lng: 147.193 };
  const airport = { lat: -9.4438, lng: 147.22 };

  it('returns undefined when either end has no coordinates', () => {
    // The caller must show "no fare" rather than quote from a guess.
    expect(estimateRoute(undefined, airport)).toBeUndefined();
    expect(estimateRoute(boroko, undefined)).toBeUndefined();
  });

  it('is symmetric — the same journey either way', () => {
    expect(estimateRoute(boroko, airport)).toEqual(estimateRoute(airport, boroko));
  });

  it('scales straight-line distance up, never down', () => {
    // Roads are longer than the crow flies; under-reading loses money on
    // every trip.
    const r = estimateRoute(boroko, airport)!;
    expect(r.distanceKm).toBeGreaterThan(0);
    expect(ROUTE_ESTIMATE.roadFactor).toBeGreaterThanOrEqual(1);
  });

  it('applies a floor so a very short hop still pays', () => {
    const nextDoor = { lat: -9.464, lng: 147.1931 };
    expect(estimateRoute(boroko, nextDoor)!.distanceKm).toBe(ROUTE_ESTIMATE.minimumDistanceKm);
  });

  it('gives a longer duration for a longer distance', () => {
    const near = estimateRoute(boroko, { lat: -9.47, lng: 147.2 })!;
    const far = estimateRoute(boroko, { lat: -9.383, lng: 147.156 })!;
    expect(far.durationMin).toBeGreaterThan(near.durationMin);
  });
});

describe('formatting', () => {
  it('renders Kina symbol-first', () => {
    expect(currencySymbol('PGK')).toBe('K');
    expect(formatMoney(12.4, 'PGK')).toBe('K12.40');
  });

  it('makes an unmapped currency obvious rather than silently wrong', () => {
    expect(formatMoney(5, 'XYZ')).toBe('XYZ 5.00');
  });

  it('omits distance and time when the job has no route', () => {
    expect(formatDistance(undefined)).toBeUndefined();
    expect(formatDuration(undefined)).toBeUndefined();
    expect(formatDistance({ distanceKm: 4.2, durationMin: 12 })).toBe('4.2 km');
    expect(formatDuration({ distanceKm: 4.2, durationMin: 12 })).toBe('12 min');
  });

  it('returns empty rather than "Invalid Date" for a missing timestamp', () => {
    expect(formatClock(undefined)).toBe('');
    expect(formatClock('not-a-date')).toBe('');
  });
});
