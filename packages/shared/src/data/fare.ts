// Fare engine. Pre-booking, fare is a function of (route, tier); after
// booking it is locked and changes ONLY via a confirmed add-stop amendment
// (CLAUDE.md "Fare amendments").

import { FARE_RATES, TIERS } from '../constants';
import type { FareBreakdown, TierId } from '../types';

export interface RouteEstimate {
  distanceKm: number;
  durationMin: number;
}

function roundStep(n: number): number {
  const s = FARE_RATES.roundStep;
  return Math.round((Math.round(n / s) * s) * 100) / 100;
}

export function tierById(id: TierId) {
  const t = TIERS.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown tier: ${id}`);
  return t;
}

export function computeQuote(route: RouteEstimate, tierId: TierId): FareBreakdown {
  const tier = tierById(tierId);
  const base = FARE_RATES.base * tier.fareMultiplier;
  const distance = FARE_RATES.perKm * route.distanceKm * tier.fareMultiplier;
  const time = FARE_RATES.perMin * route.durationMin * tier.fareMultiplier;
  const total = roundStep(base + distance + time + FARE_RATES.cityLevy);
  return {
    base: roundStep(base),
    distance: roundStep(distance),
    time: roundStep(time),
    cityLevy: FARE_RATES.cityLevy,
    total,
    currency: FARE_RATES.currency,
  };
}

// New locked total for a trip amended with an extra stop: the remaining route
// grows by the stop's detour; the customer must confirm the returned total
// before it replaces the lock.
export function amendedTotal(current: FareBreakdown, detour: RouteEstimate, tierId: TierId): number {
  const tier = tierById(tierId);
  const extra =
    (FARE_RATES.perKm * detour.distanceKm + FARE_RATES.perMin * detour.durationMin) * tier.fareMultiplier;
  return roundStep(current.total + extra);
}

export function formatMoney(n: number, currency: string = FARE_RATES.currency): string {
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${n.toFixed(2)}`;
}
