# Safeco Taxi Booking — build plan (2026-08-12)

Full build across the three apps. Governing rules live in `../CLAUDE.md`; this
file is the execution plan. Screens and copy derive from the design export
(`../ride-hailing-app-ui-mockups/`) re-skinned to the approved depth-based
direction.

## Phases

- **0. Platform (DONE)** — npm-workspaces monorepo, `@safeco/shared` tokens +
  elevation scale + embossed Button, driver app scaffold, verified on emulator.
- **1. Foundation (this pass)** — shared UI kit, mock data layer, fare +
  assignment business logic, Supabase schema file, fonts.
- **2. App screens (this pass, parallel)** — Driver, Customer, Admin screens on
  the mock backend.
- **3. Supabase wiring (later)** — create the Supabase project, run
  `supabase/schema.sql`, add env vars, swap mock store for live queries +
  realtime subscriptions. Blocked on project credentials.
- **4. Release polish (later)** — brand assets (logo says "Safco"; needs
  regeneration), app icons/splash, EAS builds, on-device QA.

## Decisions made for this build (recorded in CLAUDE.md)

- **Admin = Expo app with web enabled** — one codebase serves the dispatcher's
  phone (queue cleared one-handed) and the desk's browser (wide two-pane
  console). This is why shared tokens stayed platform-agnostic.
- **Navigation: `@react-navigation/native-stack`** in all three apps.
- **Simulation-first**: apps run against `@safeco/shared`'s in-memory mock
  store (seeded with the design export's cast: requests 40116–40120, drivers
  Marisol A. / Jonas P. / Ify N., dispatcher Ravi K., Kingsway ward) until
  Supabase credentials exist. UI code talks to the store API only, so the swap
  is contained.
- **Fonts: `@expo-google-fonts/source-serif-4`** loaded per app; typography
  token names match its exported family names. Mono = platform monospace.

## App screen maps

### Driver (`apps/driver`)
| Screen | Map rule | Content |
|---|---|---|
| Home | details-dominant, map strip | masthead, online toggle (embossed Button), earnings stat + day-part ledger |
| JobOffer | **details-dominant** (deciding) | countdown (2:00), Office + dispatcher name, pickup/drop rows, fare, decline/confirm |
| ToPickup | **map-dominant** | single line: customer, pickup note, ETA; Arrived |
| OnTrip | **map-dominant** | single line: destination, fare locked; Complete |
| TripSummary | details | fare, day total, back to Home |

### Customer (`apps/customer`)
| Screen | Map rule | Content |
|---|---|---|
| SignIn | none | phone OTP only (mocked code step) |
| Plan (pickup/dest) | details-dominant, map strip | pickup row, destination, recents |
| TierSelect | details-dominant, strip/absent | stacked cards, **selection by elevation** (selected `floating`, rest `raised`), per-tier fare recalc, `Book {tier} · {fare}` |
| OfficeAssigning | details-dominant | "The Office is assigning your car", Ravi K., step ledger, fare locked, cancel |
| Approach | **map-dominant** | single-line driver/plate/ETA + expandable card, safety button |
| DriverArrived | details-dominant (identification) | driver card, plate chip, note to driver, I'm in |
| Trip | **map-dominant** | arrival + fare line; actions: share trip, **add stop (priced amendment confirm; hidden on Share)**, quiet ride |
| Arrival | details | stars, tip chips |
| Receipt | details | itemised ledger incl. amendment + tip lines, price promise |
| Scheduled | details | tomorrow card + recurring list (static mock) |

### Admin (`apps/admin`, phone + web wide layout)
| Screen | Map rule | Content |
|---|---|---|
| Queue | details-dominant | stats header (cars free / waiting / avg assign / today), needs-a-car list (wait timers, magenta >60s), running trips |
| Assign | details-dominant, map strip | request + note, **vehicle list filtered to requested tier** with filter chip, "show other tiers" → mismatch acknowledgment, **no-vehicle → upgrade-at-quote panel** (bounds from constants), Hold / Assign → awaiting-confirm state |
| Wide (web ≥900px) | — | Queue + Assign side by side (the design export's desk console) |

## Data model

Shared types in `packages/shared/src/types.ts` (job lifecycle, per-tier fares,
amendments, vehicles with required tier + seats). Postgres mirror in
`supabase/schema.sql`: profiles, vehicles, jobs, job_events (audit timeline),
upgrade_log (cost review). RLS enabled; policies stubbed for later hardening.

## Verification per pass

Each app: `npx tsc --noEmit` clean, then `npx expo export` (android; admin also
web) to prove the bundle. Spot-check on the emulator.

## Visual pivot (2026-08-12, after phase 2)

Two re-skins post-build: (1) newsprint → "modern app look" (sans, cards);
(2) → **Lumina Glass** (current law, see CLAUDE.md "Visual system"): dark
glassmorphism + soft-UI over a mesh gradient. New token layer
`packages/shared/src/lumina/` + component kit `@safeco/shared/ui`; customer
SignIn is the reference screen. **Remaining migration**: all other customer
screens, driver app, admin app — roll out screen by screen with the same kit;
retire the old paper-token kit when done.

## Known opens

Real tier list (provisional Go/XL/Share in `constants.ts`); Supabase
credentials; brand asset regeneration; ops tuning of upgrade bounds.
