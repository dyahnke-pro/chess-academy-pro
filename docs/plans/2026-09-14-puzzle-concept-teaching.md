# Puzzle concept teaching + Master classroom quiz (2026-09-14)

David: "Tie coach into master puzzles so it can quiz them in the classroom. Also
have the computers linked up and try to get the coach able to teach the concepts.
This will also be useful to the other puzzles. Not just a hint with an arrow, but
an explanation of the concepts to understand the solution." Scope: **Master
level first.**

## What shipped

**The concept engine (`src/services/puzzleConceptExplanation.ts`) — computed, G0.**
Links the computers that already existed: `dnaLineNarrator` (board-true solution
mechanics from chess.js) + `chess-concepts.json` via `chessConceptService.getConcept`
(the general IDEA behind the pattern — our distilled public-domain teaching). No
LLM. Two entry points sharing one composer:
- `explainPuzzleConcept({fen, solutionUci, themes})` — puzzle convention (FEN is
  pre-setup, opponent moves first); narrates from the student's key move.
- `explainDrillConcept({setupFen, solutionSan, themes})` — classroom drill
  convention (board already at student-to-move).
Output: `{conceptName, conceptId, line, idea, arrow, spoken}`. `THEME_TO_CONCEPT_ID`
maps Lichess themes → the 56 `chess-concepts.json` ids (tac-fork, mate-back-rank,
…). Gate: `puzzleConceptExplanation.test.ts` (7).

**D2 — every puzzle solution teaches the concept (shared PuzzleBoard).** On the
terminal state (solved OR shown), `PuzzleBoard` renders a concept block
(`data-testid="puzzle-concept-explanation"`) and speaks the concept once
(verbosity-gated). Shared → Master, tactics/adaptive, drill, mistakes all benefit
("useful to the other puzzles"). Master Level (`AdaptivePuzzlePage master`) adds a
Continue pause (`data-testid="concept-continue"`) so the lesson lands before the
next puzzle — the classroom teaching beat.

**D3 — quiz master puzzles in the classroom (`/coach/teach`).**
- `coachDrillService.pickMasterDrill()` — Dexie-backed (the elite pool is
  lazy-fetched, not bundled), multi-move favored, nearest the master reach rating.
  `master` is a drillable aid; `CoachDrill` now carries `themes`.
- `trainingAidRouter` — a `master` route ("master tactics/puzzles", "master
  level", "quiz me on master…"; masterclass/opening surfaces untouched).
- `CoachTeachPage` — `startMasterDrill()` seeds + loads a master puzzle in-place
  (the two drill-launch sites route `master` to it, bypassing the mistake queue);
  `completeDrill` teaches the concept on solve via `explainDrillConcept`.

## Gates
`puzzleConceptExplanation.test.ts`, `coachDrillService.test.ts` (pickMasterDrill),
`trainingAidRouter.test.ts` (master route), PuzzleBoard/AdaptivePuzzlePage/
CoachTeachPage component tests. Audit: `audit-reach-ladder-prod.mjs` extended +
a classroom master-drill prod check.

## Next (not built tonight — for David to steer)
- Concept teaching on the ADAPTIVE-MISTAKE-QUEUE drill path (completeDrill's
  `progress` branch) — today it teaches on the single-drill path.
- Concept-teaching depth tuning (how much idea vs mechanics) after David hears it.
