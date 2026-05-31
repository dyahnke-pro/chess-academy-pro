# Remove the legacy walkthrough board; one play UI on /coach/teach

**Date:** 2026-05-31
**Branch:** `claude/magical-fermat-4iCMx`
**Driver:** David — *"when i asked coach to teach the middle game plans of the
Pirc it routed me to the old walkthrough page. I WANT EVERYTHING ON THE STANDARD
BOARD!! ... remove that old walkthrough board ... COMPLETELY GONE ... this is the
only UI i want shown for users to play on ... consistency is SO important."*

David's explicit choices this session:
- Scope: **"Both — kill it everywhere"** (legacy WalkthroughMode + the coach
  middlegame route).
- Play target: **"Right here on the /coach/teach big board"** — middlegame plans
  play on the same big interactive board as opening walkthroughs.

## Root cause

THREE visually-distinct "old walkthrough board" surfaces existed:

1. **`MiddlegamePlanInline`** (in `/coach/teach`) — picking a Pirc middlegame plan
   mounted a separate cramped runner (small static board + play/next/restart).
   **The exact surface David screenshotted.**
2. **`WalkthroughRunnerBody`** in `CoachSessionPage` (`/coach/session/middlegame`)
   — the bare session runner reached from global search / coach intent.
3. **`WalkthroughMode`** (legacy) — the speed-tier "Move X / N" board, the fallback
   on opening detail pages when no curated lesson exists; narrated from the
   board-inaccurate auto-annotations G9.3 bans.

## Fix — one runtime, one board

Middlegame plans now play through the SAME `useTeachWalkthrough` runtime as opening
walkthroughs, on the big `/coach/teach` board (identical lead-the-eye arrows +
highlights, voice-gated advance, WalkthroughControls).

### Changes
- **`services/middlegamePlanner.ts`** — new `buildPlanWalkthroughTree(plan,
  orientation)`: authored plan line → LINEAR `derived` `WalkthroughTree` (per-move
  prose → `narration[0]`, learn cue → `shortIdea`, arrows/highlights mapped).
  `derived: true` keeps it out of stage-gen/cache paths.
- **`components/Coach/CoachTeachPage.tsx`** — `startMiddlegamePlan` →
  `walkthrough.start(buildPlanWalkthroughTree(...))`. Removed `MiddlegamePlanInline`,
  the play-out overlay, `middlegameSession`/`playOutSession`,
  `syntheticOpeningFromSession`. Added a `?plans=<opening>` kickoff deep-link that
  auto-runs the authored plan(s) on arrival.
- **`components/Search/SmartSearchBar.tsx`** + **`services/coachSessionRouter.ts`** —
  `continue-middlegame` → `/coach/teach?plans=<opening>` (was
  `/coach/session/middlegame`).
- **`components/Coach/CoachSessionPage.tsx`** — `kind === 'middlegame'` is now a
  redirect to `/coach/teach?plans=...`; removed `MiddlegameSessionBody`. (`narrate`,
  a separate game-narration feature, keeps `WalkthroughRunnerBody`.)
- **`components/Openings/OpeningDetailPage.tsx`** — deleted the 3 `WalkthroughMode`
  mounts:
  - main / variation-walkthrough fallback (no curated lesson) → redirect to
    `/coach/teach?opening=<name>` (DB-narration standard board).
  - trap / warning-walkthrough fallback → `trapLineToFallbackPlayableLine` →
    `PlayableLinePlayer` on the standard board (empty annotations → sanctioned
    move-dictation = honest silence vs. the banned auto-annotations).
- **Deleted:** `WalkthroughMode.tsx`, `MiddlegamePlanInline.tsx`,
  `WalkthroughMode.test.tsx`, `WalkthroughIntegration.test.tsx`.
- **Tests updated:** `CoachSessionPage.test.tsx` (middlegame → redirect),
  `coachSessionRouter.test.ts` (route → `/coach/teach?plans=`), `e2e/openings.spec.ts`
  (legacy `walkthrough-*` testids → modern `lesson-player`).

## Status

- [x] Converter + CoachTeachPage rewire
- [x] SmartSearchBar / coachSessionRouter / CoachSessionPage reroute
- [x] OpeningDetailPage WalkthroughMode removal + standard-board fallbacks
- [x] Delete legacy components + tests; update affected unit/e2e tests
- [x] typecheck clean; targeted gates green (CoachSessionPage, coachSessionRouter,
      middlegamePlanner, middlegamePlanThemes, OpeningDetailPage.wiring,
      MiddlegamePlans/EndgamePlansSection, CoachTeachPage, SmartSearchBar)
- [ ] **Post-deploy 3-instrument audit (G1)** once landed: `/coach/teach` →
      "teach me the Pirc middlegame plans" → pick a plan → assert it plays on the big
      board (no `MiddlegamePlanInline`, no `walkthrough-mode`); audit-stream
      `coach-surface-migrated` / `CoachTeachPage.startMiddlegamePlan`; narration
      listener confirms voice. Voice playback can't be verified headless — route to
      David on device.

## Decisions log

- **2026-05-31** — Drive plans through `useTeachWalkthrough` (tree conversion) rather
  than a parallel runner, for one consistent board (David's explicit priority).
  `derived: true` avoids opening-specific stage-gen on a mid-game position.
- **2026-05-31** — `narrate` keeps the runner body (distinct feature).
- **2026-05-31** — Left `sessionFromPlan` / `resolveMiddlegameSessionWithFallback`
  exported (now app-unused but still tested) — deleting is out of scope.

## ⚠️ Pre-existing blocker (NOT from this change)

`src/data/modelGames.test.ts` fails: 3 caro-kann model games
(`mg-caro-kann-two-knights-variation`, `-panov-botvinnik-attack`,
`-tartakower-breyer-variation`, from commit `ed30165`) lack a resolvable `sources[]`.
Verified failing with this branch's changes stashed — independent of the walkthrough
work. Not fixed here (real game provenance needed; fabricating sources violates the
no-invention rule). Flagged for a content pass.
