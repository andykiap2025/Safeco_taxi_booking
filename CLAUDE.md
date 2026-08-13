# Safeco Taxi Booking

A dispatch-based ride-hailing app for Android and iOS (React Native). Product name: **Safeco Taxi Booking**. Tagline: **"A driver you can see coming"**.

## What's in this repo

- `ride-hailing-app-ui-mockups/` — Claude Design export (HTML prototypes). Source of truth for screens, flows, copy structure and design tokens:
  - `project/RideScreen.dc.html` — all 15 mobile screens (rider, dispatcher-mobile, driver)
  - `project/DispatchDesk.dc.html` — desktop dispatcher console
  - `project/MapPlate.dc.html` — the halftone map component
  - `project/_ds/broadsheet-*/styles.css` — the token sheet (colour ramps, type, spacing, radii)
  - `project/android-frame.jsx`, `project/support.js`, `_ds_bundle.js` — prototype harness only; ignore for implementation
- Brand assets (replaced with corrected artwork 2026-08-12 — spelling is now "Safeco" and nothing is cropped). Canonical copies at repo root, mirrored into `apps/*/assets/brand/`:
  - `logo-emblem.png` — square rounded-tile icon, circular "Safeco Taxi Service" lockup. Used as app icon, Android adaptive-icon foreground, admin web favicon, and the customer sign-in hero tile (rendered `contain`, no zoom).
  - `splash-screen.png` — emblem + "Safeco" wordmark tile. Splash image in all three apps (`contain` on `#0f0f1a`).
  - `logo-full.png` — tall "Safeco Taxi Service Booking" circular lockup; reserve for wide/marketing surfaces, not yet used in-app.
  - Sources the user supplied sit beside them at root (`app icon (3).png`, `splash.png`, `logo (2).png`). All artwork is green-on-white by design and is presented as deliberate white tiles inside the Lumina dark theme.
- `apps/` + `packages/` — the npm-workspaces monorepo (see Platform & repo layout). Reference implementation of the shared embossed Button: `packages/shared/src/components/Button.tsx`.

## Naming rules (decided 2026-08-12)

- Product name is **Safeco Taxi Booking**. Replace ALL placeholder "Dispatch Ride App" / "DISPATCH" masthead branding from the design export.
- The word **"dispatch" is internal only.** It may appear in code, comments, and internal docs to describe how jobs are assigned (dispatch queue, dispatch events, dispatcher role). It must **never appear in user-facing strings**.
- In UI copy, drivers and customers see **"Office"** or the **dispatcher's actual name** — e.g. "At the Office · Ravi K.", "Ravi K. sent you this job" — never "dispatch desk", "dispatch", or "dispatcher".

## Auth (decided 2026-08-12; implemented 2026-08-13)

**Phone OTP only.** No Google sign-in, no other OAuth/social providers — the desk operates on verified phone numbers. The design export's sign-in screen shows a "Continue with Google" button; it is dropped.

- Implemented in `@safeco/shared/auth` (platform-agnostic — the Admin console is also web). `startAuthWatch()` once at startup; screens read `useAuth()`.
- **Four stages, and they are not interchangeable:** `loading` (restoring a persisted session — render nothing, NEVER the sign-in screen, or every returning user sees a flash of it), `signedOut`, `needsProfile`, `ready`.
- **Sign-in is not a route inside the app stack.** The gate in each `App.tsx` picks the navigator. A signed-out user must not be able to reach an app route by navigating, and an expired session must be able to eject a user mid-flow.
- **First sign-in captures a name** (`FirstRunNameScreen`). `profiles.name` is NOT NULL and this is the name the driver and the Office see — a phone number in that slot reads as a broken record on the desk.
- **Self-signup can only ever create `role = 'customer'`.** Enforced in RLS *and* by a trigger, not in app code. Driver and dispatcher accounts are provisioned by the Office.
- A failed profile *read* must not sign the user out — that would discard a valid session over a transient network error.

## Backend, data & security (2026-08-13)

Supabase project is live (Sydney, `ap-southeast-2`). `supabase/schema.sql` is the single source of truth for schema AND policies; it is idempotent, so re-running it is the normal way to apply changes.

- **Config via `EXPO_PUBLIC_*`**, referenced literally as `process.env.EXPO_PUBLIC_NAME` with dot notation. Expo **inlines these at build time** — destructuring or dynamic lookup silently yields `undefined`, and editing `.env` requires `npx expo start --clear`, not a reload. `.env` is gitignored; `.env.example` is committed per app.
- The anon key is **designed to be public** and ships in the bundle. **RLS, not key secrecy, is what protects data.** The `service_role` key must never appear in an app, an `.env`, or this repo.
- **Session storage is AsyncStorage, not `expo-secure-store`** — SDK 57 documents an iOS value ceiling around 2048 bytes, and an access + refresh token pair exceeds it. Auto-refresh is bound to `AppState`.
- **The live store** (`@safeco/shared` → `data/live.ts`) keeps the same state shape screens already select against, hydrated from Supabase and kept current by realtime. It adds `sync: { status, error }`, because a network store can be loading and can fail — the mock could do neither.
- **Never add client-side scoping filters** on top of RLS. One query returns the right rows for all three roles (customer → own, driver → assigned, desk → all); a duplicate filter in app code silently diverges from policy.
- **Realtime is opt-in per table** and `jobs`/`profiles` are in the publication. Without it the desk would not see a booking until someone reloaded.
- Derived figures must stay honest: `avgAssignSeconds` and `returnedToday` read 0 until the `job_events` timeline backs them. **Do not invent a plausible number to fill a stat tile.**

### Production gates — MUST be true before real users or real money

These are not backlog items; each is a way the product breaks a promise or leaks data.

1. **Fare integrity.** RLS restricts which *rows* you may update, never which *columns* — a crafted client can currently `PATCH quoted_fare` on its own job. Every mutation touching `quoted_fare` / `status` / assignment must move behind a `SECURITY DEFINER` RPC that recomputes the quote server-side, and the direct update policy narrowed. The fare lock is a commercial promise; today it is only enforced by the UI.
2. **Upgrade rate limit.** `UPGRADE_AT_QUOTE.rateLimitPerAccount` is enforced nowhere. It belongs in the same server-side path that writes `upgrade_log`, counting prior rows in the window.
3. **Money is floating point.** Move to integer minor units before charges and reconciliation depend on the arithmetic.
4. **No payment provider, no maps/location, no push.** Push is not optional polish: the whole dispatch model rests on reaching a driver inside a 2-minute confirm window.
5. **Error, loading and offline states everywhere.** Any screen that renders an empty container when data is missing is a bug the mock store hid.
6. **Accessibility parity.** Labels and roles on interactive elements is existing law; the driver and admin screens do not yet meet it.

## Platform & repo layout (updated 2026-08-12)

- **Expo (SDK 57) + EAS** for the mobile apps — supersedes the earlier "bare React Native" note, per the monorepo instruction of 2026-08-12. Emboss gradient dependency: `expo-linear-gradient`.
- **npm-workspaces monorepo**: `apps/driver` (Expo, scaffolded), `apps/customer` and `apps/admin` (placeholder READMEs; Admin may be web), `packages/shared`.
- `packages/shared` (`@safeco/shared`) holds the design tokens + elevation scale (`src/theme.ts`), shared domain types, business constants (tiers, fallback policy, confirm windows) and the Supabase client factory. The root export is **platform-agnostic plain values — no React Native imports, no StyleSheet objects** (the Admin app may be web). React Native components live under `@safeco/shared/components` only; never re-export them from the package root.
- **Backend: Supabase.** Apps call `initSupabase({ url, anonKey, options })` once at startup (RN apps pass their own auth storage); everything else uses `getSupabase()`. Keep `@supabase/supabase-js` at **≥2.112.3**: older 2.x dists (`@supabase/functions-js` ≤2.109) ship `function*` generators with default parameters that Hermes's parser rejects in dev bundles ("Compiling JS failed … ';' expected"). Note supabase-js ≥2.112 declares `engines.node >=22` — dev machines on Node 20 get harmless EBADENGINE warnings; upgrade Node when convenient.
- `eas.json` lives in `apps/driver` — EAS requires it in the app directory and auto-detects/archives the workspace root (documented monorepo setup). Run `eas` commands from `apps/driver`.
- `apps/driver/metro.config.js` pins `watchFolders`/`nodeModulesPaths` to the workspace root. SDK 57 auto-detects monorepos; the explicit config is deliberate belt-and-braces — keep it (same file pattern in every app).
- **Admin app = Expo with web enabled** (decided 2026-08-12 to unblock the full build; supersedable): one codebase serves dispatcher mobile and the desk's browser (wide two-pane console ≥900px via `react-native-web`).
- **Navigation: `@react-navigation/native-stack`** in all apps. **State/data: live on Supabase** (since 2026-08-13) — see "Backend, data & security" above. The seeded in-memory mock store is deprecated and being removed screen group by screen group.
- **Fonts:** `@expo-google-fonts/source-serif-4` per app; `typography` token names in `theme.ts` match its family names. Build plan: `docs/BUILD_PLAN.md`.

## Visual direction (decided 2026-08-12)

**Depth-based, not flat.** This supersedes the flat newsprint treatment of the Broadsheet prototype wherever the two conflict. Layout, flows, typography, palette, and spacing still come from the export; surfaces and controls gain physical depth:

- Soft drop shadows on cards; surfaces read as physically stacked layers.
- Primary buttons are embossed/raised and **physically depress on tap** (pressed state = reduced elevation).
- **Light source is top-left, always.** Every shadow, highlight, and gradient must agree with it.
- **Nothing floats without a reason.** Elevation signals importance and interactivity; static inline content stays flush with the page.

### Elevation system (hard constraint — values approved 2026-08-12)

- `packages/shared/src/theme.ts` is the **single source of truth** for the approved five-level scale: **surface / raised / lifted / floating / pressed**. Each level defines Android `elevation` AND iOS `shadowColor` / `shadowOffset` / `shadowOpacity` / `shadowRadius` **together**, tuned so the platforms match visually — never by copying numbers across.
- **Every shadow in the app comes from this scale.** No ad-hoc shadow values in components, ever.
- Buttons: resting = raised; on press-in, swap to the pressed level so the emboss depresses; restore on press-out.
- Android caveat: the OS controls elevation-shadow direction (falls straight down), so the top-left light bias is exact on iOS and approximate on Android. Directional emboss cues come from highlight/gradient treatment, which renders identically on both platforms.

### Inner shadow / emboss (approach approved 2026-08-12)

React Native has no native inner shadow. Approved approach ("A"): **layered views + linear gradient**. Per control: outer shadow from the elevation scale; a 2-stop diagonal gradient fill (top-left lighter, bottom-right darker — agreeing with the light source) via `expo-linear-gradient`; a 1px translucent-white top highlight hairline. Pressed state: swap to the `pressed` elevation level, invert the gradient, translate the label 1px down-right. Neumorphism libraries are rejected (unmaintained). `@shopify/react-native-skia` may be adopted later, selectively, only if a true soft-inset surface is ever needed; it does not replace this approach.

## Map balance rule (constraint for ALL screens)

Map dominance is decided **per screen, never globally**:

- **Map dominates only during active movement** — driver navigating to pickup, trip in progress, customer watching the assigned car approach. Details collapse to a single line.
- **Details dominate wherever the user is deciding or reviewing** — job offers, ride options, history, receipts, account/settings, scheduled rides. Map is minimal or absent.

Apply this test to every new screen before laying it out.

## Fleet & vehicle tiers (corrected 2026-08-12)

**The fleet is NOT uniform.** Safeco runs multiple vehicle tiers at different prices. (Checked 2026-08-12: no repo content ever recorded a uniform fleet or a removed ride-options screen; if any future doc implies either, it is wrong.)

Tier list — **PROVISIONAL, awaiting the real list from the user** (the correcting instruction left its tier table unfilled). Until replaced, the design export's three tiers stand in:

| Tier | Description | Capacity | Price basis |
|---|---|---|---|
| Go | Standard sedan | 4 seats | Upfront fixed quote: base + per-km + per-minute + city levy |
| XL | Van / large vehicle | 6 seats | Same quote structure at higher per-km / per-minute rates |
| Share | Pooled ride, up to 1 extra stop | 1–2 riders | Discounted from the Go quote for the same route |

### Tier selection screen (Customer app)

- The customer chooses a tier at booking. **Selection is carried by elevation, not by borders or checkmarks**: the selected tier sits at a higher level of the elevation scale; unselected tiers sit at base. Never elevate all tiers equally — if nothing visually stands out, the pattern has failed: report that to the user rather than adding a border to compensate.
- Layout depends on tier count: **2–3 tiers → stacked full-width cards** (tier name, one-line description, capacity, fare); **4+ tiers → compact rows with fare right-aligned** (cards are too heavy). **Confirmed by the user 2026-08-12: stacked cards.** Re-raise the count rule if the real tier list turns out to have 4+ tiers. This supersedes the export's three treatment options (deck 1b–1d).
- Details-dominant under the map rule: map is a strip here, or absent.

### Pricing is per-tier

- Fare differs by tier. The estimate shown at booking **recalculates whenever the customer changes tier**. Pre-booking, fare is never a single scalar — it is a function of (route, tier). Only after booking does it lock to a single quoted value (the fare-lock promise).

### Fare amendments — add-stop (decided 2026-08-12)

Add-stop stays on the live-trip screen, as a **priced amendment**. The fare lock binds Safeco, not the customer's route: a route change is a new commitment at a new fixed price, never a silent adjustment.

- Mid-trip "Add a stop" shows a new fixed quote (remaining route + stop, same formula as booking) BEFORE anything changes: "New fare $X (was $Y) · fixed".
- Confirm → the new quote becomes the new locked fare. Decline → trip continues untouched on the original lock.
- The receipt itemises the amendment as its own line; every charge traces to a quote the customer saw and accepted.
- The Office is notified and the amendment is logged on the job record (consistent with the audit-timeline model).
- **Not available on Share** — pooled rides carry another rider's promise.
- This confirm flow is the ONLY path that changes a locked fare. Nothing else may alter it.

### Tier-aware assignment (Admin app)

- Every vehicle record carries a **required `tier` field**. The desk must never have to remember which vehicle belongs to which tier.
- When the desk assigns a driver/vehicle to a job, the vehicle list is **filtered to the customer's requested tier by default**. Assigning outside the tier requires an explicit override in which the dispatcher acknowledges the mismatch.
- **Unavailability fallback (APPROVED 2026-08-12): upgrade-at-quote** — offer a higher tier charged at the requested tier's price — bounded as follows:
  - Triggers only when the wait in the requested tier exceeds a **configurable threshold**, not on any momentary shortage.
  - **One tier up only**, never more.
  - **Rate-limited per account**, so it can't be gamed for habitual free upgrades.
  - **Every instance logged** for cost review.
  - Requested tier is the top tier → degrade to quoting a longer wait in that tier.
  - Dispatcher can override per job.
  - Capacity rule (changed 2026-08-12): upgrade eligibility **always checks the offered vehicle's seat capacity against the party size** — it never relies on tiers being capacity-ordered. Tier rank selects the candidate tier; the seat check gates the offer. Data implications: vehicle records carry seat capacity alongside the required `tier` field, and the check needs a party size — until booking captures one explicitly, use the conservative proxy *offered capacity ≥ requested tier's capacity* (assumes the party fills the requested tier; needs no extra booking UI).

## Visual system: LUMINA GLASS (decided 2026-08-12, round 3 — CURRENT LAW)

Supersedes the light paper palette and the "Visual voice" section below. Direction: **glassmorphism + soft-UI on premium dark** ("frosted glass floating over a living gradient"). Dark-only; **no flat white/gray backgrounds anywhere**.

- **Single sources of truth** in `@safeco/shared`: `src/lumina/theme.ts` (colors, typography, spacing, radius), `src/lumina/shadows.ts` (ALL shadows), `src/lumina/animations.ts` (durations, springs, helpers). Zero hardcoded style values in components or screens.
- **Every screen wraps in `ScreenContainer`**: base `#0f0f1a` under a 135° mesh gradient (`#1a1b4b → #4c1d95 → #0d9488`) with 2–3 ambient orbs.
- **UI kit at `@safeco/shared/ui`**: ScreenContainer, GlassCard, GlassGroup, NeuButton, InsetInput, GlassListItem, GlassBadge, GlassModal, GlassHeader, GlassTabBar. Components accept `variant` props and consume tokens exclusively.
- **Android reality (documented adaptations, honest by design):** iOS `shadow*` props don't render on Android — only `elevation` (+ `shadowColor` tint on API 28+). Therefore: colored glow/ambient effects = absolutely-positioned **gradient halo layers**, not shadow props; neumorphic raised/pressed and input inset = **layered highlight/shade views + gradients** (extension of the approved emboss approach A); real background blur is deliberately NOT used (Android perf) — glass = translucent fills + 1px borders, `expo-blur` may be adopted later for modals only.
- Typography: system sans with the spec's scale/weights; `BrandWordmark` (serif "SAFECO") survives as the only brand mark. Inputs never show the Android underline. Text always uses a typography token.
- **Survives from earlier decisions:** naming rules (Office, never dispatch), the map rule, tier selection carried by prominence (now glow + elevated glass, still no borders/checkmarks), ≥48dp touch targets, phone-OTP auth, all business rules, a11y labels/roles on interactive elements. (Simulation-first data is superseded — the apps are live on Supabase.)
- Migration status: ALL screens in all three apps are Lumina (rollout completed 2026-08-12). The old paper-token kit (`@safeco/shared/components`) survives only for: BrandWordmark, MonoText, CountdownBadge, MapPlate (Lumina-dark), and the non-visual `useMockState`.
- **Grouping amendment (2026-08-13, user directive): related items share ONE container.** A column of individual cards is banned — it reads as N unrelated things and wastes the vertical space the content needs. Related rows stack flush inside one `GlassGroup` (or one `GlassCard`), divided by hairline separators, with a single border/shadow/halo around the set. `GlassListItem` is therefore a **row, not a card**: no fill, border, radius or shadow of its own; it takes its horizontal inset from `GroupContext` (zero when dropped straight into an already-padded card). Separators inset to the title's left edge, past the icon tile. Selection inside a group is a **teal tint + 3dp teal left bar** — a full focus border cannot work mid-group. Grouping applies to information AND actions, and to multi-card screens: split cards covering one subject get merged into one card with an internal hairline. **The one exception is the tier-selection screen**, where the cards must stay separate because selection is carried by elevation.
- **Surface amendment (2026-08-12, user directive): cards and buttons are WHITE/GREY, not translucent glass.** Tokens: `colors.surface.*` (near-opaque white card, white button, grey wells/pressed states) with **dark ink text on surfaces** via `colors.onSurface.*`. The mesh gradient + orbs remain the ground; free-standing text on the gradient stays white WITH text shadows; text on light surfaces is dark ink with NO text shadow. The primary button keeps its teal glow halo + floating shadow over its white fill. Icon tiles/badges keep their colour tints.

## Visual voice (decided 2026-08-12 — SUPERSEDED by Lumina Glass above)

User feedback: the Broadsheet newsprint styling "looks like a newspaper cutting and not an app". Decision: **modern app look**.

- **System sans-serif for ALL UI text** (no custom UI font — RN default / SF / Roboto). Weights carry hierarchy (400/500/600/700).
- **Source Serif 4 bold survives ONLY as the brand wordmark** ("SAFECO" — `BrandWordmark` component). Nothing else is serif.
- **Monospace only for tabular data**: plates, countdowns, figures that align.
- **Newspaper furniture is banned**: no thick-thin masthead rule pairs, no mono dateline kickers ("TAXI BOOKING · TUE 12 AUG"), no double-rule ledger totals as decoration.
- Content sits on **card surfaces** (elevation scale); avoid full-bleed open "paper" pages and large dead space.
- Unchanged: colour rules (cyan interactive / magenta reserved), elevation scale + embossed buttons, map rule, spacing tokens, ≥48px tap targets.
- Implementation: shared `BodyText` (sans) is the default text primitive; `SerifText` remains as a deprecated alias that renders sans (legacy name from the newsprint phase); `Kicker` renders sans uppercase.

## Design language (extracted from the export)

- Palette: paper `#f3f2f2`, surface `#eae9e9`, ink `#201e1d`. Cyan `#0088b0` is the only interactive colour (hover `#1186ac`, pressed `#006786`, selection tint `#cbeeff`). Magenta `#d6006c` is reserved for destination and safety (text shade `#aa0b56`, tint `#fff1f4`). Neutrals: `#d7d3d3`, `#bab6b6`, `#7d7979`, `#605d5d`, `#444141`. Shadow ink `#2d2b2b`. Full OKLCH ramps live in the export's `styles.css`.
- Never put both accents in one small component. Accent-coloured body-size text uses deep cyan `#006786` (contrast).
- Type: SUPERSEDED by "Visual voice" above — the export's serif-everything typography is retired; body minimum 16px stands.
- Spacing scale 5/10/15/20/30/40; radii 1/2/4 (2px default); tap targets ≥48px.
- Shadows in the export were flat-minimal; they are superseded by the elevation scale above.

## Open decisions

- Real tier list (name, description, price basis per tier) — user to supply; provisional Go/XL/Share stands in until then (encoded in `packages/shared/src/constants.ts` `TIERS`). Tier-screen layout is already settled: stacked cards.
- **Kina tariff (BLOCKING before any real booking).** Currency is PGK as of 2026-08-13 and renders as `K12.40` via `currencySymbol()`. **The rates were not re-tariffed** — they are the design-phase figures that once denominated USD, so the same ride now quotes K12.40 instead of $12.40, roughly a quarter of its former real value. Current quotes: Go K12.40 / Share K8.20 / XL K18.90 over 4.2 km · 12 min. Set real Kina rates in `FARE_RATES` together with the fleet list. Tip chips (K1/K2/K5) want revisiting at the same time.
- Currency symbols live in `CURRENCY_SYMBOLS` in `data/fare.ts`; screens must use `currencySymbol()` / `formatMoney()` and never a literal. An unmapped code renders as `CODE 12.40`, deliberately ugly so it gets noticed.
- Upgrade-at-quote defaults pending ops tuning: wait threshold (300s) and per-account rate limit (2 per 30 days) in `packages/shared/src/constants.ts` are placeholders.
- **Phone auth runs on TEST OTPs ONLY (2026-08-13). SMS does not work.** The Phone provider is enabled with *placeholder* Twilio credentials, because the dashboard validates those fields as required even when only test numbers are used. Test numbers bypass the provider entirely, so the placeholders are never exercised — but **any number not in the test list receives nothing**. Configured pair: `67583122058` → `417226` (entered without the `+`, per the field's format), with an expiry date on the pairs themselves.
  - Before launch: real Twilio (or other provider) credentials, and confirm **+675 / Papua New Guinea deliverability** with the provider — PNG carrier rules are the variable, not the account. A Twilio trial only sends to numbers verified inside Twilio.
  - Keep **SMS OTP Length = 6** in sync with `CODE_LENGTH` in the sign-in screen; the six code wells are built for exactly six digits.
- **Migration COMPLETE (2026-08-13).** All three apps run on live Supabase data; `mockStore` and `useMockState` are deleted. Every app has a phone-OTP gate. The customer app has a first-run name step; the driver and Office apps do NOT — those roles are provisioned by the Office (RLS forbids self-signup as anything but a customer), so a wrong-role session gets `AccessDeniedScreen`.
- **Invented data removed (2026-08-14).** Every screen now shows recorded data or nothing. `job_events` is written on every transition and drives the customer's audit timeline plus the desk's `avgAssignSeconds` / `returnedToday`. Jobs store the `route` they were quoted from, so the receipt's distance and time — which are CHARGE LINES — match the fare beside them. Driver earnings come from their own completed jobs; Plan's recents from the customer's own history.
- **No dead controls (2026-08-14).** A button that does nothing is a lie the user only discovers at the worst moment. Call/Message now open the dialer and SMS app with the driver's real number (readable only while rider and driver share a live job); "Report an issue" writes a `job_event` the Office can see. Removed instead: Receipt PDF (no generator), "Share live trip" (needs a trackable link), "Quiet ride requested · On" (a preference never stored or sent). **`EMERGENCY_NUMBER` in `constants.ts` is null and the safety sheet hides its emergency action until it is set — a LAUNCH BLOCKER.** A button labelled "Call emergency services" that dials a wrong number is worse than no button; do not guess it.
- **Identification data never falls back.** On Approach and DriverArrived the driver name, car and **plate** render empty rather than defaulting — that text is what a rider matches against a car at the kerb, so an invented plate could walk someone into the wrong vehicle.
- **The rule this establishes: never invent a number to fill a slot.** Where the data does not exist, show nothing or say so. Removed rather than faked, because each needs a subsystem that does not exist: candidate ETAs (the desk was reading list position as "3 min"), distance-to-pickup, live trip countdowns — all need **location**; "Visa · 4417 — charged" on the receipt and a saved card at booking — need **payments**; the entire Scheduled screen, which showed rides nobody had booked behind dead Edit/Cancel buttons — needs a **scheduled-rides table**. Each is now an honest empty state. Restore them only alongside the subsystem, never as display strings.

## Known workflow hazard (Windows + SDK 57 dev server)

After bulk multi-file edit bursts (agent passes), Metro's incremental delta state can go stale: the device shows a Hermes red screen "Compiling JS failed … ';' expected" at an arbitrary line while the actual source graph is fine (`tsc` clean, fresh bundle fetch shows valid code at that line). Fix is mechanical: kill the Metro process, `npx expo start --clear`, force-stop Expo Go, relaunch. Do NOT chase the reported line number first — verify with a fresh bundle fetch, then clear-restart. (Hit three times on 2026-08-12.)

## Process

- Propose visual/system decisions for review before building them.
- Elevation scale and emboss approach approved 2026-08-12; screens may be built when the user asks.
