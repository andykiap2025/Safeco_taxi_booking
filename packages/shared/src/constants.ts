// Business constants — decisions recorded in CLAUDE.md govern these values.

export const PRODUCT_NAME = 'Safeco Taxi Booking';
export const TAGLINE = 'A driver you can see coming';

// PROVISIONAL tier list — design-export stand-ins; replace when the user
// supplies the real fleet (CLAUDE.md "Fleet & vehicle tiers").
// sortOrder is the upgrade ladder: upgrade-at-quote moves exactly one step up.
export const TIERS = [
  { id: 'share', name: 'Share', description: 'Pooled ride, up to 1 extra stop', seats: 2, sortOrder: 0, fareMultiplier: 0.641 },
  { id: 'go', name: 'Go', description: 'Standard sedan', seats: 4, sortOrder: 1, fareMultiplier: 1 },
  { id: 'xl', name: 'XL', description: 'Van / large vehicle', seats: 6, sortOrder: 2, fareMultiplier: 1.556 },
] as const;

// Quote formula (calibrated to the design export's receipt: Go over
// 4.2 km / 12 min = $12.40): (base + perKm·km + perMin·min) · tierMultiplier
// + cityLevy, rounded to roundStep.
export const FARE_RATES = {
  base: 4.5,
  perKm: 1.2,
  perMin: 0.18,
  cityLevy: 0.7,
  roundStep: 0.05,
  currency: 'USD',
} as const;

// Job offers return to the queue if the driver doesn't confirm in time.
export const DRIVER_CONFIRM_WINDOW_SECONDS = 120;

// Queue wait timers flag magenta past this age.
export const QUEUE_WAIT_FLAG_SECONDS = 60;

// Upgrade-at-quote fallback (approved 2026-08-12; bounds are policy, see
// CLAUDE.md "Tier-aware assignment"). Capacity rule: the offered vehicle's
// seats must cover the party size — party size unknown → proxy is the
// requested tier's seat count. Never rely on tier order for capacity.
export const UPGRADE_AT_QUOTE = {
  // Only offer an upgrade once the wait in the requested tier exceeds this.
  // Ops-configurable; this is the default.
  waitThresholdSeconds: 300,
  maxTiersUp: 1,
  // Defaults pending ops tuning.
  rateLimitPerAccount: { maxInstances: 2, windowDays: 30 },
  logEveryInstance: true,
} as const;

// Add-stop is a priced amendment (decided 2026-08-12) and is unavailable on
// pooled tiers — another rider's promise is in the car.
export const ADD_STOP_DISALLOWED_TIERS = ['share'] as const;
