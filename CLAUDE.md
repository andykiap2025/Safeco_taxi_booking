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

## Auth (decided 2026-08-12)

**Phone OTP only.** No Google sign-in, no other OAuth/social providers — the desk operates on verified phone numbers. The design export's sign-in screen shows a "Continue with Google" button; drop it when implementing.

## Platform & repo layout (updated 2026-08-12)

- **Expo (SDK 57) + EAS** for the mobile apps — supersedes the earlier "bare React Native" note, per the monorepo instruction of 2026-08-12. Emboss gradient dependency: `expo-linear-gradient`.
- **npm-workspaces monorepo**: `apps/driver` (Expo, scaffolded), `apps/customer` and `apps/admin` (placeholder READMEs; Admin may be web), `packages/shared`.
- `packages/shared` (`@safeco/shared`) holds the design tokens + elevation scale (`src/theme.ts`), shared domain types, business constants (tiers, fallback policy, confirm windows) and the Supabase client factory. The root export is **platform-agnostic plain values — no React Native imports, no StyleSheet objects** (the Admin app may be web). React Native components live under `@safeco/shared/components` only; never re-export them from the package root.
- **Backend: Supabase.** Apps call `initSupabase({ url, anonKey, options })` once at startup (RN apps pass their own auth storage); everything else uses `getSupabase()`. Keep `@supabase/supabase-js` at **≥2.112.3**: older 2.x dists (`@supabase/functions-js` ≤2.109) ship `function*` generators with default parameters that Hermes's parser rejects in dev bundles ("Compiling JS failed … ';' expected"). Note supabase-js ≥2.112 declares `engines.node >=22` — dev machines on Node 20 get harmless EBADENGINE warnings; upgrade Node when convenient.
- `eas.json` lives in `apps/driver` — EAS requires it in the app directory and auto-detects/archives the workspace root (documented monorepo setup). Run `eas` commands from `apps/driver`.
- `apps/driver/metro.config.js` pins `watchFolders`/`nodeModulesPaths` to the workspace root. SDK 57 auto-detects monorepos; the explicit config is deliberate belt-and-braces — keep it (same file pattern in every app).
- **Admin app = Expo with web enabled** (decided 2026-08-12 to unblock the full build; supersedable): one codebase serves dispatcher mobile and the desk's browser (wide two-pane console ≥900px via `react-native-web`).
- **Navigation: `@react-navigation/native-stack`** in all apps. **State/data: simulation-first** — UI talks only to the mock store API in `@safeco/shared` (seeded from the design export) until Supabase credentials exist; Postgres schema ready in `supabase/schema.sql`.
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
- **Survives from earlier decisions:** naming rules (Office, never dispatch), the map rule, tier selection carried by prominence (now glow + elevated glass, still no borders/checkmarks), ≥48dp touch targets, phone-OTP auth, all business rules, simulation-first data, a11y labels/roles on interactive elements.
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
- Upgrade-at-quote defaults pending ops tuning: wait threshold (300s) and per-account rate limit (2 per 30 days) in `packages/shared/src/constants.ts` are placeholders.

## Known workflow hazard (Windows + SDK 57 dev server)

After bulk multi-file edit bursts (agent passes), Metro's incremental delta state can go stale: the device shows a Hermes red screen "Compiling JS failed … ';' expected" at an arbitrary line while the actual source graph is fine (`tsc` clean, fresh bundle fetch shows valid code at that line). Fix is mechanical: kill the Metro process, `npx expo start --clear`, force-stop Expo Go, relaunch. Do NOT chase the reported line number first — verify with a fresh bundle fetch, then clear-restart. (Hit three times on 2026-08-12.)

## Process

- Propose visual/system decisions for review before building them.
- Elevation scale and emboss approach approved 2026-08-12; screens may be built when the user asks.
