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

// Kina is written symbol-first with no space: K12.40. Unknown codes fall back
// to "CODE 12.40", which is ugly on purpose — it should be noticed and mapped.
const CURRENCY_SYMBOLS: Record<string, string> = {
  PGK: 'K',
  USD: '$',
  AUD: 'A$',
};

/** The bare symbol, for icon tiles and chip labels that show no amount. */
export function currencySymbol(currency: string = FARE_RATES.currency): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

export function formatMoney(n: number, currency: string = FARE_RATES.currency): string {
  return `${currencySymbol(currency)}${n.toFixed(2)}`;
}

/** "4.2 km" / "12 min" for a stored route. Returns undefined when the job has
 *  no route, so callers omit the line rather than invent a distance. */
export function formatDistance(route?: RouteEstimate): string | undefined {
  return route ? `${route.distanceKm.toFixed(1)} km` : undefined;
}

export function formatDuration(route?: RouteEstimate): string | undefined {
  return route ? `${Math.round(route.durationMin)} min` : undefined;
}

/** Local clock time from an ISO timestamp: "9:41". Used for the audit
 *  timeline and receipt lines, which previously hardcoded times. */
export function formatClock(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
