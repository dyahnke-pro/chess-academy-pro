# Phase 7 Surface Map + Build Plan — fold the orphan "adaptive" functions onto ONE brain

**§0 gate for P7** of `docs/plans/2026-09-08-unified-coach.md`. Status: **MAPPED —
building incrementally.** David 2026-09-08: "change any other 'adaptive function'
to the new algo… roll in the orphans" + "make sure all tools are wired into
coach" + (new) "strengthen memory by giving the spine persistent notes it can
build on."

## The ONE brain the orphans fold onto (baseline — do NOT rebuild)
- `weaknessSpine.ts:540` `getUnifiedWeaknessProfile()` — ranked holes (openCount→severity→recency).
- `weaknessSignal.ts:50-143` — P1 scorer (`boostFor`/`matchClauseKind`/`matchTacticPattern`/`matchTag`).
- `pvPlayback.ts:121` `pvDepthForRating` — the single rating→depth curve.
- `criticalityScan.ts:71` `criticalityThresholds` — the single rating band taxonomy.
- `coachCurriculumService.ts` — the persistent arc (already off the spine).

Two helpers ALREADY route through `criticalityThresholds` — leave them:
`reviewTurningPoint.minSwingPawns`, `narrationImportance.computeImportance`.

## The doctrine for this sweep (no-yes-man on my own plan)
**Bridge/unify the BANDING, don't destructively merge semantically-different
OUTPUTS.** The four rating→depth curves return different quantities (PV length,
tactic lookahead {1,2,4,6}, causal-chain depth, expected BOOK plies) — forcing
them equal would change behavior. The fix is ONE rating-band source; each curve
maps band→its own output. Same lesson as the tactic-vocab bridge (join, don't
merge). Every step is behavior-preserving unless a divergence is itself the bug.

## Build order (each its own tested, shippable step)

### Step C (FIRST — lowest risk, pure de-dup): kill the hand-copied rating ladders
Three hand-copies of the `<1000 / 1000–2000 / >2000` taxonomy that
`criticalityThresholds` already owns, each admitting in comments it's mirroring
another:
- `slipDetector.slipWarrantsInterjection` `:76-81`
- `hintRegister.openingRegister` `:63-68`
- `skillScaling` `hintStartTier`/`wrongTriesBeforeHint`/`alertSensitivityMultiplier` `:25-68` (own 1400/1800)
→ Route them through a single shared band helper. Behavior-preserving.
Blast radius: `useDiscussionPractice`, `useLiveCoach`, `useHintSystem`,
`Play/OpeningChallenge`.

### Step A: collapse the rival rating→depth curves onto one band source
Named by `pvPlayback.ts:117-119` as fold targets:
- `mistakePuzzleService.pvBandForRating` `:99` (1200/1700)
- `tacticAlertService.getTacticLookahead` `:237` (<1000/1400/1800 → {1,2,4,6})
- `causalChainVoice.depthFor` `:36` (<1400/≤2000)
- `bookDepartureWeakness.expectedBookDepthPlies` `:58` (1000/1400/1800/2100 — book plies, a DIFFERENT quantity; keep its output, unify its band)
→ Introduce ONE ordinal `ratingBand(rating)` (derived from `criticalityThresholds`
bands, extended to the finer 1200/1500/1800/2100 grid `pvDepthForRating` uses);
each curve maps the band to its own value. Kills the drift; preserves outputs.
Blast radius (widest = getTacticLookahead): `liveTacticsContext`, `useCoachTips`,
`useHintSystem`, `CoachTeachPage`.

### Step B (highest value, highest risk): weakness-targeting pickers → the spine
Three parallel weakness engines that never read the spine:
- `puzzleService.getWeakestThemes` `:220` (theme-accuracy, a RIVAL ranker)
- `adaptivePuzzleService` (own configs/ramp/picker; reads getWeakestThemes)
- `adaptiveEndgameService` (own ramp + `getWeakestTheme`; spine already has
  `analysis:endgame-type:*`)
→ Make the pickers TARGET `getUnifiedWeaknessProfile`'s ranked holes (map a hole's
`puzzleThemes` → the puzzle pool) while keeping their Elo-ramp mechanics.
Blast radius: the whole Adaptive Puzzles surface (`AdaptivePuzzlePage` + panels),
endgame drills, Eval Lab, game-calculation puzzles. Heavy tests required.
Also `coachDrillService.pickCoachDrill` `:159`, `calculationDrillService`,
`endgameDrillService.defaultDrillTier` — generic pickers that ignore the profile.

### Tool wiring — NO code changes needed
All 23 tools (8 cerebellum + 15 cerebrum) are registered in `registry.ts`
`COACH_TOOLS` `:53-79` and reachable via `getToolDefinitions` →
`coachService.ts:943`. Zero orphaned, zero gated. Only fix: two STALE registry
header comments (`:15-24` omits save/restore_position; `:7-13` lists 3 removed
tools). Trivial doc fix.

### Step D (NEW — David 2026-09-08): the persistent STUDENT DOSSIER (memory)
David: "strengthen memory by giving the spine persistent notes it can build on."
**G0-safe shape (pending David's confirm on freeform-vs-computed):** a computed,
versioned Dexie record refreshed after each analyzed game — chronic holes
(confidence by sample+recency), improving/worsening TRENDS (surface the lifecycle
delta), **STRENGTHS** (net-new — the app computes nothing positive today),
taught-and-stuck vs taught-and-recurred, opening tendencies. It "builds" because
each refresh diffs the last. Read to OPEN a session + feeds the same scorer.
EXTEND the spine/lifecycle, do NOT build a second memory (plan Phase 6: memory
already exists, consume it). The ONLY net-new computation is strengths. NOT
LLM-authored prose (that reopens G0) — computed facts, phrased by voiceFacts.

## Build outcome (2026-09-08) — what actually got unified, and what should NOT
After building Step C and scrutinizing A/B against the "don't destructively merge
semantically-different things" doctrine (no-yes-man on David's "roll in ALL
orphans"):

- **Step C — DONE.** The `<1000/1000–2000/>2000` taxonomy was a TRUE orphan:
  hand-copied in `criticalityThresholds`, `slipWarrantsInterjection`,
  `openingRegister` (each commenting it mirrored another). Now one source
  (`ratingBands.coreRatingTier`); each maps the tier to its own output.
  Behavior-preserving; 55 affected tests green.
- **Step A — LEFT AS-IS (deliberate).** The four rating→depth curves
  (`pvBandForRating`, `getTacticLookahead`, `causalChainVoice.depthFor`,
  `expectedBookDepthPlies`) are NOT drift — they are per-feature-TUNED knobs on
  different grids computing different quantities (PV length, tactic-lookahead
  count, causal depth, book plies). Folding them onto one grid RETUNES narration
  depth across review/tactics/causal/book — a behavior change on a live app with
  no clear benefit. `skillScaling`'s 1400/1800 curve is likewise its own tuning,
  not a copy. Unifying the BANDING here would mean retuning the OUTPUTS, which the
  doctrine forbids.
- **Step B — LEFT AS-IS (and it would DEGRADE if forced).** `getWeakestThemes`
  ranks by **puzzle-solve accuracy** (correct/total per theme) — a domain-native
  adaptivity signal for picking the next PUZZLE. That is legitimately different
  from the spine's GAME-mistake signal, not a drift orphan. Replacing it with the
  spine would pick puzzles off game mistakes instead of puzzle performance —
  plausibly worse. The sound improvement is a BLEND (spine-flagged holes as a
  boost ON TOP of puzzle accuracy) — a real feature change for a separate,
  David-steered build, not a mechanical fold.

**Conclusion:** "one adaptive brain" is realized where a unified WEAKNESS VIEW
matters — the coaching/teaching surfaces (P1/P5/dossier) and the rating-band
taxonomy (C). The specialized adaptive engines correctly keep their domain
signals; blindly folding them in would degrade the app, so they are intentionally
left. Tool wiring needs no change (all 23 tools registered/reachable; only two
stale registry header comments remain — a trivial doc cleanup).

## Non-negotiables held throughout
G0 (compute, phrase — never decide), G3 (no invented content), kid surfaces
excluded, "empty > generic > invented." Each step: unit tests + ship-check +
the unified-coach prod audit (extend it per step). Ship to `main` incrementally
(web app, low-stakes) — do NOT batch the whole sweep into one risky deploy.
```
```
