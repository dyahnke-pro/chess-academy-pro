# Endgame Tab — UX Contract + Audit Coverage

How `/coach/endgame` SHOULD work, and what the e2e audit (`e2e/coach-endgame.spec.ts`) currently exercises.

The hub is at **`/coach/endgame`** (component: `src/components/Coach/CoachEndgamePage.tsx`). It exposes 8 sub-tabs through a single horizontally-scrollable strip. Every sub-tab below is reachable by clicking `[data-testid="endgame-tab-<value>"]`.

| Sub-tab | Value | Component | Substrate |
|---|---|---|---|
| Mating | `mating-patterns` | `PatternPicker` / `LessonView` / `CuratedMatingLessonView` | `useEndgamePlayout` + `useClickToMove` + walkthrough adapter |
| Principles | `principles` | `EndgameLessonTab` | `useEndgamePlayout` + `useClickToMove` + `ConsistentChessboard` |
| Pawn | `pawn-endings` | `EndgameLessonTab` | same |
| Rook | `rook-endings` | `EndgameLessonTab` | same |
| Drawing | `drawing-patterns` | `EndgameLessonTab` | same |
| Eval Lab | `eval-lab` | `EvalLabQuiz` → `QuizItemRunner` | `useEndgamePlayout` (stage 1/2) |
| Calculation | `calculation` | `CalculationTab` | `useEndgamePlayout` with `extendToObviousWin` |
| Your Games | `from-your-games` | `FromYourGamesTab` | `useEndgamePlayout` with `extendToObviousWin` |

---

## 1. Hub-level contract

**SHOULD WORK**
- `/coach/endgame` mounts `coach-endgame-page` without errors regardless of profile state.
- All 8 tabs are clickable; clicking each tab leaves the page mounted.
- Tab strip is horizontally scrollable (max-w-lg container, 8 × 68px min-width tabs).
- Mastery badge (`endgame-hub-mastered-count`) is gated on `masteredCount > 0` — fresh profile = no badge.
- Header back-button has `aria-label="Back to coach hub"` and routes to `/coach/home`.

**AUDIT COVERAGE**
- ✅ `hub loads with all 8 tabs + mastery badge is conditional on count`
- ✅ `each tab is reachable and produces its content view`
- ✅ `tab strip is horizontally scrollable + every tab clickable`

---

## 2. Mating Patterns tab

**SHOULD WORK**
- Pattern picker shows tiles grouped by recognition vs full-practice. Each tile renders `endgame-pattern-<patternId>`.
- Picking a tile dispatches:
  - **Has `puzzleThemeTag`** → adaptive flow → `LessonView` with `endgame-mating-hint`, `endgame-show-options`, fork-choice options after 2 wrong tries, `endgame-practice-more` at leaf, `endgame-reshuffle`.
  - **No tag + curated playable position** → `CuratedMatingLessonView` with `curated-mating-hint`, `curated-mating-reveal`.
  - **No tag + no curated** → static recognition-only board, no hint controls.
- Lesson view back button: `aria-label="Exit lesson"` clears `selectedPatternId` and returns to picker.
- Hint button reveals the expected from→to highlight; `wrongAttempts >= 2` surfaces `endgame-show-options` → fork-option MC list.

**AUDIT COVERAGE**
- ✅ `mating-patterns: pick a pattern with practice puzzles → lesson loads with controls` (walks tiles until a playable one is found)
- ✅ Lesson view back-button (`Exit lesson`) is exercised inside the same test
- ⚠️ Not yet covered: 2 wrong attempts → fork-choice path (`endgame-show-options` → `endgame-fork-option-<idx>`); `endgame-practice-more` advances to next adaptive drill

---

## 3. Principles / Pawn / Rook / Drawing tabs (`EndgameLessonTab`)

These four tabs share the same component — the only difference is the lesson source.

**SHOULD WORK**
- Lesson picker shows tiles (`endgame-lesson-<id>`) with mastered-count chips ("3/7").
- Each tile carries a reset button (`endgame-lesson-reset-<id>`).
- Lesson view renders:
  - Adaptive ↔ fixed mode toggle (`endgame-drill-mode-adaptive` / `endgame-drill-mode-fixed`).
  - Tier picker (`endgame-drill-tier-<tier>`) in fixed mode.
  - Concept hint chip (`endgame-concept-hint`) — position-specific narration.
  - Hint button (`endgame-hint`) — reveals expected move highlight.
  - Mastered toggle (`endgame-position-mastered`).
  - Play-it-out CTA (`endgame-play-it-out`) — engages Stockfish post-curated-line.
  - "Back to lesson list" header button (`aria-label="Back to lesson list"`).
- "Next" button advances `posIndex`; at the last position it flips to **Done** (`endgame-lesson-done`). In adaptive mode Done never surfaces if a drill is queued — flip to fixed mode to terminate.
- Voice fires on lesson mount: `voiceService.speak()` with the lesson's narration intro.

**AUDIT COVERAGE**
- ✅ `principles: pick a lesson → board mounts + hint/concept-hint available`
- ✅ `principles: drill-mode + tier picker controls work without crashing`
- ✅ `endgame-lesson-done surfaces at the last position of a fixed-mode lesson`
- ✅ `lesson board uses ConsistentChessboard substrate`
- ⚠️ Not yet covered per-tab: `pawn-endings`, `rook-endings`, `drawing-patterns` rely on the same component but their lesson corpora differ — current audit only deep-tests `principles`. Smoke-pass in `each tab is reachable` confirms they mount.
- ⚠️ Not yet covered: `endgame-position-mastered` toggle persistence to Dexie `endgameProgress`.
- ⚠️ Not yet covered: `endgame-reshuffle-drills` produces a different drill set.
- ⚠️ Not yet covered: Stockfish post-playout accuracy recap on `endgame-play-it-out` completion.

---

## 4. Eval Lab Quiz tab

**SHOULD WORK**
- Pool seeded from `getAllEndgameLessons()` keystones (~24) + Lichess endgame puzzles (≤7 pieces, popularity ≥60, ≥80 plays).
- Per-item flow:
  - **Stage 0** (`stage0`): only for keystones (`item.isKeystone === true`). Three buttons: `eval-lab-stage0-white-wins`, `-draw`, `-black-wins`. Click → stage 1.
  - **Stage 1** (`stage1`): student plays the position. Click-to-move via `useEndgamePlayout`. `eval-lab-hint` available.
  - **Stage 2** (`stage2`): engine plays out to obvious win/draw confirmation.
  - **Reveal**: tablebase verdict + score; "Next position" via `eval-lab-next`.
- Rating updates via Elo K=32 → `UserProfile.endgameRating`.
- Empty pool → `EmptyPool` placeholder; exhausted pool → `Summary` with reshuffle.

**AUDIT COVERAGE**
- ✅ `eval-lab: tab renders and stage-1 board mounts (after optional stage-0 click)` — tolerates either initial stage.
- ⚠️ Not yet covered: stage 1 → stage 2 (engine playout) transition.
- ⚠️ Not yet covered: tablebase reveal + `eval-lab-next` advances.
- ⚠️ Not yet covered: rating delta after Elo-updating answer.

---

## 5. Calculation tab

**SHOULD WORK**
- Skill picker renders `calculation-skill-<skillId>` tiles per `getCalculationSkills()`.
- Picking a skill shows the rationale screen with `calculation-start-drill`.
- Drill view exposes:
  - `calc-concept-hint` (position narration)
  - `calc-hint` (move hint, gated on attempts)
  - `calculation-skip` (skip to next drill)
  - `calculation-next` (advance after solve)
  - `calculation-reshuffle` (new drill set)
- Uses `useEndgamePlayout` with `extendToObviousWin: true` so the engine plays past the critical move until the win is unambiguous.

**AUDIT COVERAGE**
- ✅ `calculation: skill picker → start drill → board renders`
- ✅ `calculation: skip advances to next drill`
- ⚠️ Not yet covered: solving a drill correctly + `calculation-next` advances.
- ⚠️ Not yet covered: post-solve Stockfish recap.
- ⚠️ Not yet covered: `calculation-reshuffle` produces a different drill set.

---

## 6. From Your Games tab

**SHOULD WORK**
- Mines `db.games` for endgame mistakes (queens off OR move ≥30, eval drop ≥100cp).
- Picker tiles: `from-your-games-tile-<idx>` (one per mistake).
- Empty corpus (no games imported / no qualifying mistakes) → empty-state message; page must NOT crash.
- Lesson view exposes `from-games-hint`.
- Uses `useEndgamePlayout` with `extendToObviousWin: true`.

**AUDIT COVERAGE**
- ✅ `from-your-games: empty corpus or live tile both render without errors` — accepts either populated or empty.
- ⚠️ Not yet covered: import a game, verify a tile appears, drive a solve.

---

## 7. Shared substrate

**SHOULD WORK**
- Every lesson board uses `ConsistentChessboard` (`consistent-chessboard-static` testid).
- Voice service is wired through `voiceService.speak()` on lesson mount; `logSpeakInvoked` writes `voice-speak-invoked` to Dexie `meta.app-audit-log.v1`.
- Stockfish recap (`endgameRecapService.ts`) runs after `extendToObviousWin: true` playouts; harmonic-mean accuracy per move, template narration.
- `useEndgamePlayout` returns `phase`, `studentMovesPlayed`, `isComplete`, `firstTryPerfect`, `wrongSquare`, `hintMove`, `hintRevealed`.
- `useClickToMove` derives `squareStyles` (cyan-selected + cyan-target-dots) and validates against playout's expected move.

**AUDIT COVERAGE**
- ✅ `lesson board uses ConsistentChessboard substrate`
- ✅ `voice subsystem is wired through the endgame lesson surface` (probes `voiceService.speakIfFree` + `logAppAudit` with `voice-speak-invoked`; same pattern as the opening-traps F spec)
- ⚠️ Not yet covered: Stockfish post-playout accuracy recap surface (no testid on the recap card yet — would need a `data-testid="endgame-accuracy-recap"` to verify).
- ⚠️ Not yet covered: `useEndgamePlayout` `firstTryPerfect` tracking through the UI (mastery streak logic).

---

## Side-by-side: SHOULD-WORK vs AUDIT-COVERAGE

| Surface | SHOULD-WORK count | AUDIT-COVERED | Gaps |
|---|---|---|---|
| Hub | 5 contracts | 3 ✅ | none material |
| Mating | 5 contracts | 2 ✅ | fork-choice MC, practice-more advance |
| Principles | 8 contracts | 4 ✅ | mastered toggle persist, reshuffle, play-it-out recap |
| Pawn / Rook / Drawing | inherits Principles | smoke only | full deep-test on each corpus |
| Eval Lab | 5 contracts | 1 ✅ | stage 2 playout, reveal, rating delta |
| Calculation | 5 contracts | 2 ✅ | full solve, recap, reshuffle |
| Your Games | 4 contracts | 1 ✅ | populated-corpus path |
| Shared substrate | 4 contracts | 2 ✅ | recap testid, firstTryPerfect tracking |

**Bottom line**: 13 specs cover the surface skeleton end-to-end (every tab reachable, every lesson view substrate mounts, voice + ConsistentChessboard wiring verified). The remaining gaps are all *deeper* contracts on the same substrate — fork-choice MC after wrong tries, mastery persistence, Stockfish recap surface verification, and per-corpus deep tests for pawn/rook/drawing.

---

## How to run

```bash
PLAYWRIGHT_LOCAL_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npx playwright test e2e/coach-endgame.spec.ts --reporter=line --project=chromium
```

Serial mode is forced via `test.describe.configure({ mode: 'serial' })` because parallel workers compete for the dev server and the adaptive session pool, causing time-out flakes.

Current result: **13 passed (2.9m)** locally.
