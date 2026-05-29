# PLAN — Strengthen the personal weakness engine (2026-05-27)

> Prior black-openings masterclass plan archived →
> `docs/plans/2026-05-25-black-opening-masterclasses.md`.

David: stop touching openings (masterclass authoring is done + exhausting).
Improve the PER-USER WEAKNESS engine instead — it reads signals we already
collect; it does NOT require authoring any opening content.

## Framing — what we learned reading the WHOLE loop

The collect→fuse→act→coach loop ALREADY EXISTS and works:
- `weaknessSpine.ts:getUnifiedWeaknessProfile()` merges `mistakePuzzles` +
  `misconceptionTags` into one ranked profile.
- That profile feeds the Training Plan (`trainingPlanSelector.ts`, 60/20/20
  weakness/SRS/new) AND the dashboard "Today's training" reps
  (`DashboardPage.tsx:89-150`).
- The LLM coach reads top weaknesses + skillRadar + badHabits EVERY turn
  (`coachContextSnapshot.ts:105-134`).

So the work is NOT "build a brain." It's: **plug the stranded/dead sensors
into the brain, and add two missing sensors (conversion, time-trouble).**

## Open findings (the real gaps)

- **F1 — `openingWeakSpots` is DEAD.** `weakSpotService.ts:8-36` writes
  `failCount` on every missed opening-drill move. Read fns exist
  (`getTopWeakSpots`/`getStaleWeakSpots`, `:51-84`) but have ZERO callers.
  Never re-drilled, rescheduled, or surfaced.
- **F2 — fusion is partial.** Only `mistakePuzzles` + `misconceptionTags`
  reach the unified profile. `classifiedTactics` only feeds the skillRadar
  chart (no drill gating). `findSquareAttempts` (board-vision heatmap) has no
  found consumer — likely dead.
- **F3 — no conversion signal.** Per-move evals ARE persisted
  (`MoveAnnotation.evaluation`, cp White-POV; `gameAnalysisService.ts:241-260`)
  but nothing scans the trajectory for "was winning → let it slip."
  `weaknessAnalyzer.ts:907` only INFERS conversion from endgame-puzzle accuracy.
- **F4 — no time-trouble signal.** No clock data tied to mistakes. Imported
  Lichess/Chess.com PGNs carry `[%clk]` tags; we don't mine them. Play-with-
  Coach has no clock at all (David forgot to add it).

## STATUS (2026-05-27) — no-dead-ends + loop-closure DONE

Every captured weakness sensor now feeds `getUnifiedWeaknessProfile` (which
drives the Training Plan + Dashboard reps) AND routes back to a real drill:

| Sensor | Was | Now | Loop |
|--------|-----|-----|------|
| openingWeakSpots | DEAD (write-only) | fused + routed to /openings/:id drill | CLOSED — `markWeakSpotDrilled` on a correct drill move spaces it out |
| classifiedTactics | display-only (radar) | fused (merged into tactic clusters) → /tactics/adaptive | closes via tactic-puzzle drilling |
| findSquareAttempts | read only by its own page | fused as board-vision weakness → /tactics/find-square | closes — drilling records attempts, weak-square set shrinks |
| conversion (NEW) | not captured | detector + fused → surfaces as a rep | SURFACED (dedicated convert-drill deferred per "don't add yet") |
| Play clock (NEW) | none | full clock + per-ply time capture persisted | seeds time-trouble (detector deferred) |

Tests: chessClock (7), useChessClock (5), conversionDetector (10),
weaknessSpine (+8 new), all green. typecheck 0, lint 0.

DEFERRED (David's rule: close the loop before adding): conversion's own
convert-this-position drill + close; time-trouble detector off the captured
per-ply clock data. Both are NEW features, held until the existing loops are
confirmed closed on-device.

## NEXT BUILDS (2026-05-27, unblocked — loops closed + verified on prod)

### Build A — Time-trouble detector  [status: DONE — detector+spine+route, 7 tests]
Use the per-ply `clockRemainingMs` now persisted on clocked coach games.
- `timeTroubleDetector.ts`: cross-reference `mistakePuzzles` (moveNumber +
  playerColor → ply index) with the game's `clockRemainingMs[ply]`; a blunder
  made at/under LOW_TIME_MS is a time-trouble hit. Pure + tested.
- Fold into `getUnifiedWeaknessProfile` (it already loads games + mistakes) as
  `analysis:timetrouble`, bucket general.
- Route the rep to timed play (`/coach/play?time=blitz-5-0`) — practice under
  the clock. Closes as the player stops blundering low on time.
- Note: coach-game clock is opt-in, so data is sparse until played; imported-
  game `[%clk]` extraction (analysis pipeline) is a follow-up bonus source.

### Build B — Conversion drill + close  [status: DONE — drill route + addressed-close, tested]
The conversion weakness surfaces but routes to the `/weaknesses` hub (soft).
- Route the conversion rep to play out the blown winning position
  (`/coach/play?fen=<peakFen>`) against the engine — "you were winning here,
  convert it."
- Persist addressed conversions (a `meta` key set of gameId/posKey) so a
  converted position spaces out of the profile — the close.

## Phased plan (each phase = one shippable chunk)

### Phase 1 — Play-with-Coach time control  [status: DONE — wired + tested, not yet deployed]
David's ask #1. Net-new feature.
- Add a time-control picker to the Play-with-Coach start UI (e.g. Unlimited /
  10+0 / 5+0 / 3+2 — confirm options against existing difficulty UI).
- Tick a clock during the game; detect flag/timeout → game ends, recorded as
  a loss-on-time.
- Persist the chosen time control on the saved `games` record.
- Capture per-move time spent (front half of F4 / Phase 4).
- Add loading/empty/error states per standing orders. Tests.
- Files: CoachPlayPage + `coachPlaySession.ts` + game-save path + profile pref
  default. (Surface map pending — exploration was interrupted; redo it.)

### Phase 2 — Conversion-failure detector  [status: pending]
David's ask #2. Pure post-process on already-stored evals.
- New detector: walk a fully-analyzed game's per-move evals from the player's
  POV; flag when eval reached ≥ +X (winning) then fell to ≤ +Y with a
  non-win result. Player color inferred per `mistakePuzzleService` logic.
- WIRE INTO `weaknessSpine` so it drives the Training Plan + dashboard, not a
  display-only tab. Decide the rep routing (which drill surface a conversion
  weakness sends you to — likely endgame/technique).
- Tests + thresholds tuned (avoid flagging dead-drawn or already-lost games).

### Phase 3 — Resurrect `openingWeakSpots` (F1)  [status: pending]
- Read `failCount` to reorder opening-drill positions and/or fold top weak
  spots into the unified profile so they surface in the plan.
- Decide: reorder within an opening drill, OR add as a rep type. (Respects
  "don't touch openings" — this is drill SCHEDULING, not content authoring.)

### Phase 4 — Fold stranded sensors + time-trouble (F2/F4)  [status: pending]
- Bring `classifiedTactics` + `findSquareAttempts` into the unified profile.
- Time-trouble detector from per-move time (Phase 1 for coach games; PGN
  `[%clk]` mining for imported games) → unified profile.

## Decisions log
- 2026-05-27: Openings frozen — no masterclass/content authoring this effort.
  All work is weakness-engine plumbing that consumes existing signals.
- 2026-05-27: The "fusion brain" already exists (`weaknessSpine`); earlier
  claim that "nothing fuses it" was wrong. Work = plug in stranded sensors +
  add 2 new ones, not rebuild.

## Sequencing / next-session pickup
- Phase 1 first (David asked, self-contained, seeds the time signal).
- Re-run the Play-with-Coach surface exploration (the agent call was
  interrupted) before editing — need CoachPlayPage + session + save path
  file:lines.
- Push to `main` per Deployment Policy (override the web-session branch
  default). Batch the deploy at chunk completion, not per commit.
- ship-check + the relevant audit matrix (`audit-coach-play.mjs`,
  `audit-weaknesses.mjs`) green before claiming done.
