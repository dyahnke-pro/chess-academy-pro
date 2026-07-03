# PLAN — Coach in-place adaptive mistake drills (Learn tab)

Owner: David · 2026-07-03 · Branch: `claude/brain-calculation-practice-da8jdl`

## The ask (evolved across the session)

1. **Bug** — typing "drill calculation" made the coach **LLM invent a fake
   drill** ("the purest calculation drill is finding the best first move from
   the starting position" — chess nonsense). G0 violation: the LLM decided
   chess content.
2. **Redirect** — "I don't want the user routed to the tactics tab. I want the
   coach to set them up **on the board under the Learn tab**. Move the play
   connections over to Learn."
3. **Source + adaptivity** — "Make sure the puzzles pull from **user mistakes,
   most common to least**. Run the drills until the **adaptive learning tool
   feels the user has 'tested out'** of the drill, then move to the next."

## Status

| Phase | State | Notes |
|---|---|---|
| P0 — kill the hallucination (deterministic routing) | **done, on `main`** (98f87dc) | training-aid requests handled in code, never the LLM |
| P1 — in-place drill on the Learn board | **done, on branch** (1506e5f, 4e2b344) | coach loads a REAL puzzle on the Learn board + quizzes in-place |
| P2 — source puzzles from the user's mistakes (most→least common) | **done, on branch** (f83af35) | `buildMistakeDrillQueue` + `mistakePuzzleToDrill`; 7 fake-indexeddb tests |
| P3 — adaptive "tested out → next theme" loop | **done, on branch** (f83af35, + SRS rework) | real "test out" = the app's SRS mastery via `gradeMistakePuzzle` (3 correct **spaced** reps → `'mastered'`, drops out of the pool app-wide); queue serves only DUE, non-mastered mistakes; `advanceMistakeDrill` walks the session's due queue |
| P4 — 3-instrument interactive audit on prod | **still owed** | unit-verified; interactive E2E blocked this session (env restarted 3×; prod Chromium `ERR_CONNECTION_RESET`). Run on a stable session / device, then merge. |

**Known polish (not blockers):** board orientation isn't flipped for a
Black-side mistake drill (student still plays correctly, just sees White's
view); adaptive `sessionRating` from `adaptivePuzzleService` is not yet
threaded into puzzle difficulty selection within a theme (mastery is
consecutive-correct today).

## What's built (P1) — the reusable pieces

- **`src/services/coachDrillService.ts`** (pure, 10 unit tests). `pickCoachDrill(aid, {rating})`
  → a real Lichess-DB puzzle as `{ setupFen, playerColor, solutionSan[], prompt, puzzleId, rating }`.
  `isDrillableAid(aid)` gates which aids become board drills. **Everything is
  code (G0) — the LLM only voices the prompt/feedback.**
- **`src/services/trainingAidRouter.ts`** — drillable aids hand off to
  `/coach/teach?drill=<aid>`; lesson aids (eval-lab / principles / drawing /
  weaknesses / mistakes) keep their real surface. Shared by tryRouteIntent
  (play + voice) and routeChatIntent (chat + post-game play).
- **`src/components/Coach/CoachTeachPage.tsx`** — the "play connections" on Learn:
  - `startCoachDrill(drill)` — `game.loadFen(setupFen)` + announce + voice; sets `activeDrillRef`.
  - `processDrillMove(move)` — called from `handleStudentMove` when a drill is
    active; validates the board move against `solutionSan[step]` (chess.js),
    auto-plays the opponent reply, advances / hints. **Guarded by
    `activeDrillRef` so all existing walkthrough/play flows are untouched.**
  - `?drill=<aid>` effect auto-starts the in-place drill on hand-off.

## P2 — source from user mistakes (most common → least)

Replace the `puzzles.json`-by-theme source with the user's own mistakes.

- **Data**: `mistakePuzzles` Dexie store (`src/db/schema.ts`) — each row has
  `fen`, `moves` (solution), `classification` (the tactic theme), `gamePhase`,
  `srsDueDate`, `status`. These ARE puzzles built from the user's real blunders.
- **Ranking**: group `mistakePuzzles` by `classification`; order themes by
  count desc (most common weakness first). `weaknessAnalyzer.detectWeaknessThemes(mistakes)`
  already ranks weakness themes — reuse it (returns `WeaknessTheme[]`).
- **Build**: add `async buildMistakeDrillQueue({rating}): Promise<MistakeTheme[]>`
  to `coachDrillService`, where `MistakeTheme = { theme, label, drills: CoachDrill[] }`,
  themes ordered most→least common, each theme's `drills` built from its
  mistake rows via the same `toDrill()` converter (Lichess convention already
  handled). **Fallback**: when the user has no mistakes yet (new user), fall
  back to `pickCoachDrill` on the requested aid so the drill still works.
- Unit-test with `fake-indexeddb` + seeded `mistakePuzzles`.

## P3 — adaptive "tested out → next theme"

Drive a theme QUEUE with per-theme mastery, using the existing engine.

- **Engine**: `src/services/adaptivePuzzleService.ts` — `createAdaptiveSession`,
  `processAdaptiveResult(session, rating, correct, themes)`, `getAdaptiveSessionSummary`.
  Tracks per-theme `{correct,total}` + a session rating. There is **no built-in
  "tested out" flag** — define mastery on top:
  - **Tested out of a theme** = K consecutive correct on that theme (K≈3) OR
    theme accuracy ≥ 80% over ≥ 5 attempts at/above the user's band. Keep it
    simple + explicit; log the decision.
- **Drill state** (extend `activeDrillRef`): `{ queue, themeIdx, puzzleIdx,
  drill, step, consecutiveCorrect, session }`.
  - Solved puzzle: `processAdaptiveResult`; `consecutiveCorrect++`. If tested
    out → announce "You've tested out of <theme> — on to <next>", `themeIdx++`,
    load next theme's first drill. Else next puzzle in theme.
  - Wrong move: `consecutiveCorrect = 0`; hint; retry (already in `processDrillMove`).
  - Queue exhausted → "That's every weakness we had queued — nice work."
- Persist mastery across sessions (SRS fields on `mistakePuzzles`, or a small
  `drillMastery` meta record). Confirm retroactive handling for existing users.

## P4 — verification (owed)

- Unit: coachDrillService (done) + P2/P3 logic (fake-indexeddb).
- Interactive (G1/G7): `scripts/audit-training-aid-routing.mjs` (written this
  session) drives `/coach/teach`, types the drill phrases, asserts routing.
  Extend it to assert the board loads a real puzzle, solving advances, and the
  theme rotates on tested-out. Run the 3-instrument audit on **prod** once the
  env is stable (this session: prod Chromium `ERR_CONNECTION_RESET`, 3 restarts).
- **Do NOT merge P2/P3 to `main` until the interactive audit is green** — it's a
  stateful interactive feature for beta users.

## Next-session pickup

1. P2 `buildMistakeDrillQueue` + tests (safe to land).
2. P3 queue + mastery in `activeDrillRef`.
3. Point `startCoachDrill` / `?drill=` at the mistake queue; "drill my mistakes"
   → the full ranked queue.
4. P4 audit on a stable session, then merge to `main`.

Foundation commits: 98f87dc (P0, main), 1506e5f + 4e2b344 (P1, branch).
Interactive verification of P1 could not run this session (env instability) —
it is owed alongside P4.
