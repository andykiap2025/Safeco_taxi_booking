// Business constants — decisions recorded in CLAUDE.md govern these values.

export const PRODUCT_NAME = 'Safeco Taxi Booking';
export const TAGLINE = 'A driver you can see coming';

// Dial prefix the sign-in screen shows and that bare numbers are normalised
// against. Papua New Guinea (+675) — the operation's home country. A wrong
// value here silently sends OTPs to a different country's number space.
export const DEFAULT_DIAL_CODE = '675';

// PROVISIONAL tier list — design-export stand-ins; replace when the user
// supplies the real fleet (CLAUDE.md "Fleet & vehicle tiers").
// sortOrder is the upgrade ladder: upgrade-at-quote moves exactly one step up.
export const TIERS = [
  { id: 'share', name: 'Share', description: 'Pooled ride, up to 1 extra stop', seats: 2, sortOrder: 0, fareMultiplier: 0.641 },
  { id: 'go', name: 'Go', description: 'Standard sedan', seats: 4, sortOrder: 1, fareMultiplier: 1 },
  { id: 'xl', name: 'XL', description: 'Van / large vehicle', seats: 6, sortOrder: 2, fareMultiplier: 1.556 },
] as const;

// Quote formula: (base + perKm·km + perMin·min) · tierMultiplier + cityLevy,
// rounded to roundStep. Currency is PNG Kina.
//
// ⚠ RATES ARE NOT YET TARIFFED FOR KINA. These figures were calibrated in the
// design phase so a Go ride over 4.2 km / 12 min came to 12.40 in the export's
// currency, which was USD. Switching the denomination to PGK (2026-08-13) did
// NOT re-price anything: the same ride now quotes K12.40, roughly a quarter of
// the previous real value. Set real Kina rates alongside the fleet/tier list
// before taking a booking — see "Open decisions" in CLAUDE.md.
export const FARE_RATES = {
  base: 4.5,
  perKm: 1.2,
  perMin: 0.18,
  cityLevy: 0.7,
  roundStep: 0.05,
  currency: 'PGK',
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

// ⚠ LAUNCH BLOCKER — MUST be set before real riders use the app.
//
// The emergency number for the operating country, in E.164. Deliberately null:
// the safety sheet HIDES its emergency action while this is unset, because a
// button labelled "Call emergency services" that dials a wrong number is worse
// than no button at all — someone would press it in the one moment they cannot
// afford a second attempt.
//
// Set it to the confirmed national emergency number for Papua New Guinea. Do
// not guess it, and do not copy it from another country's app.
export const EMERGENCY_NUMBER: string | null = null;
