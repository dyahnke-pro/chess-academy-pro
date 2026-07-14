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

Everything else is **walled** (Pro only): all of `/coach/*`, `/academy/*`, the
other 36 openings + all pro-reps + all gambits + `/openings/srs`, `/kid/*`, and
puzzle-solving once the 20-bucket is spent.

### Free-opening eligible pool (the "main 40")

Source: `repertoire.json` (43 masterclass openings). EXCLUDE the sacrificial
gambits/countergambits (style tagged `"Gambit"`, plus King's Gambit whose style
string omits the word): `kings-gambit`, `evans-gambit`, `benko-gambit`,
`budapest-gambit`, `albin-countergambit`, `schliemann-defence`. Also exclude
everything in `gambits.json` (7 gambit-tab lessons) and every `pro-*` id.
→ **37 mainstream principled openings** eligible for the free pick.

> Judgment call (flagged for David): kept the Najdorf / Grünfeld / QGA — they're
> pillar main-line openings that merely *play* counter-attackingly; "counter
> openings" is read as countergambits + the Schliemann, not these. Say the word
> to drop them too.

## Architecture

The hard gate is one boolean (`shouldShowPaywall = gateEnabled && !isResolving
&& !isPro`) wrapping ALL routes in `App.tsx`. Replace that all-or-nothing wrap
with a **route-aware access gate** + a **global puzzle meter**, all dormant
unless `isPaywallGateEnabled()` (unchanged flag) AND not Pro.

### 1. Free-tier state — Dexie + Zustand mirror
- **Dexie** new store `freeTier` (single row `id='singleton'`): `puzzlesSolved`,
  `freeOpeningId:string|null`, `updatedAt`. Bump `db.version(...)` + upgrade fn
  (Standing Order: new Dexie store ⇒ version bump + upgrade).
- **`freeTierService.ts`**: `FREE_PUZZLE_LIMIT=20`; `FREE_OPENING_POOL` (computed
  set, above); `loadFreeTier()`, `recordPuzzleSolved()`, `puzzlesRemaining()`,
  `hasPuzzlesLeft()`, `claimFreeOpening(id)` →
  `'ok'|'already-claimed-this'|'denied-other'|'not-eligible'`, `isFreeOpening(id)`,
  `canViewOpening(id, state)` (pure, no side effect — for the gate).
- **`freeTierStore.ts`** (Zustand runtime mirror) hydrated on boot; the meter +
  gate read this synchronously.

### 2. Access policy — one pure function
`accessPolicy.ts` → `resolveAccess({ pathname, isPro, gateEnabled, freeTier })`
→ `{ decision:'allow'|'wall'|'meter', feature }`.
- gate off OR isPro → `allow` everything.
- non-Pro: FREE_PREFIXES → allow; `/openings` explorer → allow (browse);
  `/openings/:id` → `canViewOpening` ? allow : wall; `/openings/pro/*` +
  `/openings/srs` → wall; `/tactics/*` puzzle-solving → `meter` (mount, board
  self-walls when empty); `/coach/*`, `/academy/*`, `/kid/*` → wall; else wall.

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
- **P1** — Dexie `freeTier` store + `freeTierService` + `freeTierStore` + tests.
- **P2** — `accessPolicy` pure module + tests (the whole allow/wall/meter matrix).
- **P3** — `AccessGate` route-aware component (replaces `PaywallGate` wrap);
  opening claim-on-open; wall walled routes. Component tests.
- **P4** — `usePuzzleMeter` + wire the global counter at the solve chokepoint +
  board-level upsell when spent. Tests.
- **P5** — `PaywallPage` contextual `feature` copy. Test.
- **P6** — ship-check green; write `audit-freemium-gate.mjs` (drive: fresh
  non-Pro sees app not wall; open 2nd opening → wall; spend puzzles → wall;
  weakness/upload free; coach walled). Add to matrix + AUDIT_INDEX.
- **P7** — PRESENT to David. Do NOT push the paywall-behavior change to
  `main`/App Store until he says ship (it alters the build under review).

## Decisions log
- 2026-07-14: puzzle allotment = 20 lifetime bucket (not daily). — David
- 2026-07-14: free opening = user-picked, first-opened, main-40 only (no
  pro-reps/gambits/counters). — David
- 2026-07-14: weakness tab free to view; drilling spends the puzzle bucket. — David
- OPEN (flagged): keep Najdorf/Grünfeld/QGA in the free pool? (assumed yes)
- OPEN: is `/kid/*` walled for non-Pro? (assumed yes — premium content)

## Next-session pickup
Backbone = `freeTierService` + `accessPolicy` + `AccessGate`. The flag
(`VITE_PAYWALL_ENABLED`) and RevenueCat wiring are UNCHANGED — this only changes
WHAT the gate walls, from "everything" to "everything except the free tier."
Nothing ships to prod/App Store until David approves P7.
