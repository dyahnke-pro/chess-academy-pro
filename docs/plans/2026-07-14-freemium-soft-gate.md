# PLAN — Freemium soft gate (replace the hard paywall with a metered free tier)

**David's ask (2026-07-14):** the App Store build currently hard-walls the
WHOLE app on launch (`VITE_PAYWALL_ENABLED=true`). Change it to a **soft/metered
free tier** so a fresh downloader can actually try the product before paying.

## Locked spec (David's decisions)

Free tier for a non-Pro user (gate live), NO subscription required:

1. **Upload / import games — unlimited free.** `/games`, `/games/import`.
2. **Weakness tab — free to VIEW.** `/weaknesses`, `/weaknesses/games`. The
   analysis (patterns, mistake breakdown, weak openings) is the payoff of
   uploading games. Drilling from it still spends the puzzle bucket.
3. **Puzzles — 20 total, LIFETIME bucket (one-time, no daily reset).** GLOBAL
   counter: every puzzle solved on ANY surface (tactics, mistake puzzles,
   weakness drills, calculation, adaptive, classic…) draws from the same 20.
   (A per-surface counter would be pointless — they'd drill unlimited via the
   weakness tab. The cap is only meaningful if it's global.)
4. **One opening — view + play through.** The user picks it: the FIRST eligible
   opening they open claims the free slot. Eligible = the **main-40 masterclass
   openings only**. NOT pro-reps (`/openings/pro/*`), NOT gambits, NOT
   counter-openings.
5. Plus the shell: dashboard/home, settings, account, onboarding, calibration,
   legal.

6. **Kid section — free for ONE WEEK.** `/kid/*` is free for a non-Pro user for
   7 days from their FIRST kid-section access (stamp `kidFirstAccessAt` on first
   `/kid/*` entry), then walled. A time-boxed trial of the kids content.

Everything else is **walled** (Pro only): all of `/coach/*`, `/academy/*`, the
other 36 openings + all pro-reps + all gambits + `/openings/srs`, puzzle-solving
once the 20-bucket is spent, and `/kid/*` after the 7-day window.

### Free-opening eligible pool = the MAIN opening tab (David 2026-07-14 final)

"Anything in the main opening tab is ok. If not in the main opening tab, don't
include it." The main tab = the **Masterclasses** tab, whose list is
`getMasterclassOpeningIds()` = every `opening-manifests.json` key (minus
`_comment`/`_schema`). So `FREE_OPENING_POOL` is derived from that SAME source
and auto-tracks the tab → **43 openings**. This INCLUDES the masterclass gambits
that live in the main tab (King's/Evans/Benko/Budapest/Albin/Schliemann) and
EXCLUDES the separate **Gambits** tab (`gambits.json`: smith-morra, scotch-
gambit, …), the **Elite**/pro-rep tab (`/openings/pro/*`), the **Counter**-
Weapons tab, and the raw ECO **All** tab. Supersedes the earlier "37 / minus-6-
gambits" heuristic (the Najdorf/Grünfeld/QGA question is moot — the whole main
tab is in).

## Architecture

The hard gate is one boolean (`shouldShowPaywall = gateEnabled && !isResolving
&& !isPro`) wrapping ALL routes in `App.tsx`. Replace that all-or-nothing wrap
with a **route-aware access gate** + a **global puzzle meter**, all dormant
unless `isPaywallGateEnabled()` (unchanged flag) AND not Pro.

### 1. Free-tier state — Dexie + Zustand mirror
- **Dexie** new store `freeTier` (single row `id='singleton'`): `puzzlesSolved`,
  `freeOpeningId:string|null`, `kidFirstAccessAt:number|null`, `updatedAt`. Bump
  `db.version(...)` + upgrade fn (Standing Order: new Dexie store ⇒ version bump
  + upgrade).
- **`freeTierService.ts`**: `FREE_PUZZLE_LIMIT=20`; `KID_FREE_MS = 7*24*60*60*1000`;
  `FREE_OPENING_POOL` (computed set, above); `loadFreeTier()`,
  `recordPuzzleSolved()`, `puzzlesRemaining()`, `hasPuzzlesLeft()`,
  `claimFreeOpening(id)` → `'ok'|'already-claimed-this'|'denied-other'|'not-eligible'`,
  `isFreeOpening(id)`, `canViewOpening(id, state)` (pure), `stampKidAccess()`
  (idempotent first-touch), `kidWindowActive(state, now)` (pure: null start ⇒
  active/not-yet-started, else `now-start < KID_FREE_MS`).
- **`freeTierStore.ts`** (Zustand runtime mirror) hydrated on boot; the meter +
  gate read this synchronously.

### 2. Access policy — one pure function
`accessPolicy.ts` → `resolveAccess({ pathname, isPro, gateEnabled, freeTier })`
→ `{ decision:'allow'|'wall'|'meter', feature }`.
- gate off OR isPro → `allow` everything.
- non-Pro: FREE_PREFIXES → allow; `/openings` explorer → allow (browse);
  `/openings/:id` → `canViewOpening` ? allow : wall; `/openings/pro/*` +
  `/openings/srs` → wall; `/tactics/*` puzzle-solving → `meter` (mount, board
  self-walls when empty); `/kid/*` → `kidWindowActive` ? allow (+stamp first
  touch) : wall; `/coach/*`, `/academy/*` → wall; else wall.

### 3. Route-aware gate component
`AccessGate` wraps `<AppLayout/>` (same slot as `PaywallGate` today). Reads
`useLocation()`, runs `resolveAccess`. `wall` → `<PaywallPage feature=…/>`;
`allow`/`meter` → render the app. `/openings/:id` claim is a side-effect in an
effect (never in render): if `canViewOpening` and slot empty → persist
`claimFreeOpening(id)`.

### 4. Global puzzle meter
`usePuzzleMeter()` → `{ remaining, hasLeft, recordSolve }`. Increment at the
shared solve chokepoint (locate the single puzzle-record write; else a thin
hook the solve sites already have `onSolved` for). When `!hasLeft`, the puzzle
board shows the upsell (route to `PaywallPage feature='puzzles'`) instead of the
next puzzle. Pro / gate-off ⇒ `recordSolve` no-ops, `hasLeft` always true.

### 5. PaywallPage — contextual upsell
Accept optional `feature` prop: headline copy per context ("You've used your 20
free puzzles", "Unlock every opening", "Coach is a Pro feature"). Keep the
existing plan picker / trial / restore / legal links.

## Phases (each a logical commit; DO NOT deploy until David approves the cutover)

- **P0** — this plan doc. ✅
- **P1** — Dexie `freeTier` store (v32) + `freeTierService` + `freeTierStore` +
  tests. ✅ (freeTierService.test.ts 10 green)
- **P2** — `accessPolicy` pure module + tests (allow/wall/meter matrix). ✅
  (accessPolicy.test.ts 25 green)
- **P3** — `AccessGate` route-aware component (replaced `PaywallGate` wrap in
  App.tsx, incl. the KidLayout route); opening claim-on-open + kid-stamp
  effects; boot hydration wired in App.tsx. ✅ (AccessGate.test.tsx 15 green;
  old PaywallGate.tsx deleted — orphaned)
- **P4** — `usePuzzleMeter` + wired the global counter into the two shared
  boards (PuzzleBoard, MistakePuzzleBoard) — covers classic/adaptive/drill +
  weakness-themes/mistakes/weakness-drill/create; route gate walls the rest of
  `/tactics/*` once spent. ✅
- **P5** — `PaywallPage` contextual `feature` copy + a "back to free features"
  link (soft-gate needs a way back). ✅ (PaywallPage.test.tsx 4 green)
- **P6** — ship-check; `audit-freemium-gate.mjs` written (web non-regression +
  documents that the WALL is native-only to exercise). ⏳ ship-check running.
- **P7** — PRESENT to David. Do NOT push to `main`/App Store until he approves
  (it alters the build under review). ⏳

## Testability note (important)
On WEB the billing layer is keyless → entitlement = `unconfigured` → isPro=true
→ the gate is DORMANT (app fully open, zero behavior change). The wall only
engages when isPro=false, which is ONLY true on a NATIVE build with a RevenueCat
key and no active subscription. So the wall behavior (2nd opening → wall, spent
puzzles → wall, coach → wall, kid after 7 days) is proven by the unit/component
matrix (65 tests) and must be spot-checked on a TestFlight build with a StoreKit
sandbox account. The web audit only proves the safe no-op.

## PostHog events (Standing Order)
- `paywall_viewed` — fired by `AccessGate` when a route is walled. Props:
  `{ feature: 'opening'|'puzzles'|'coach'|'academy'|'kid'|'app', path: string }`.

## Decisions log
- 2026-07-14: puzzle allotment = 20 lifetime bucket (not daily). — David
- 2026-07-14: free opening = user-picked, first-opened, main-40 only (no
  pro-reps/gambits/counters). — David
- 2026-07-14: weakness tab free to view; drilling spends the puzzle bucket. — David
- 2026-07-14: free-opening pool = the MAIN opening tab (Masterclasses) exactly
  = `getMasterclassOpeningIds()` = 43 manifest openings (incl. main-tab gambits;
  excl. Gambits/Elite/Counter/All tabs). Supersedes the 37/minus-gambits rule. — David
- 2026-07-14: kid section free for ONE WEEK (7 days from first kid access),
  then walled. — David
- 2026-07-14: free-tier description shown (2) at the top of the PaywallPage
  ("Free plan includes") and (3) in the App Store description copy
  (`docs/store-listing-copy.md`, apply-on-freemium-ship). — David

## Next-session pickup
Backbone = `freeTierService` + `accessPolicy` + `AccessGate`. The flag
(`VITE_PAYWALL_ENABLED`) and RevenueCat wiring are UNCHANGED — this only changes
WHAT the gate walls, from "everything" to "everything except the free tier."
Nothing ships to prod/App Store until David approves P7.
