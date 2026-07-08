# Wire actual games into the Calculation tactics drill

**Date:** 2026-07-08
**Branch:** `claude/tactics-calculation-sources-ply97i`
**Ask (David):** "Wire in actual games. But need to make sure they match the
patterns properly."

## Problem

`/tactics/calculation` (`CalculationTab` → `useAdaptiveEndgameSession` →
`adaptiveEndgameService.pickAdaptivePuzzle`) serves positions **only** from
the static Lichess DB (`src/data/puzzles.json`). None of the user's own
mistakes are used — the only personal signal is the adaptive difficulty band.

## The pattern-matching constraint (the hard part)

The six calculation skills are defined by **Lichess theme tags**:

| Skill | Themes |
|---|---|
| Find the Mate | `mateIn2/3/4/5` (exclude `mateIn1`) |
| Quiet Move | `quietMove` |
| Forcing Sequence | `long` |
| Defensive Calc | `defensiveMove` |
| Race Calculation | `advancedPawn`, `promotion` |
| Tactical Pattern | `sacrifice`, `attraction`, `deflection` |
| Adaptive (auto) | `endgame` |

Game-derived puzzles (`MistakePuzzle`, `classifiedTactics`) carry a
`TacticType` enum (`fork | pin | skewer | …`) that does **not** reverse-map
onto these skills. Trusting the stored tag would mis-file puzzles (e.g. a
stored `fork` says nothing about whether the line is a mate, a quiet move,
or a race).

**Solution — compute the match from the actual line (G0/G3: the LLM/tag
decides nothing; code computes the fact).** A new pure classifier replays a
puzzle's solution UCI line with chess.js and returns the calc-skill themes it
**genuinely demonstrates**:

- `mateInN` — only if the line actually ends in `#` delivered by the student,
  N = student plies to mate.
- `long` — only if the student makes ≥3 moves in the line.
- `quietMove` — only if the student's first move is neither a check nor a
  capture.
- `promotion` / `advancedPawn` — only if a real promotion / 7th-rank pawn push
  is in the student's line.
- `sacrifice` — only if the student's material genuinely dips below its
  starting value at some point in the line (a real investment).
- `deflection` — carried through when the stored `tacticType` is `deflection`.
- `endgame` — when `gamePhase === 'endgame'` (feeds the Adaptive tile).

A game puzzle feeds a skill only when its computed themes intersect the
skill's themes (same any-of rule the static filter uses). A puzzle that
matches nothing is dropped — never force-fit.

**`defensiveMove` is intentionally NOT matched from game data** in v1. "The
only move that holds" can't be detected reliably from a stored line without a
full multi-candidate engine pass; per "empty > generic > invented" we leave
Defensive Calc on the static pool rather than mislabel a mistake puzzle as
defensive. Documented so a later pass can add an engine-verified detector.

## Seam

1. **`src/services/calculationSkillMatch.ts`** (new, pure) — the classifier
   above. Fully unit-tested against crafted positions.
2. **`src/services/gameCalculationPuzzleService.ts`** (new) — loads
   `getAllMistakePuzzles()`, classifies each line, synthesizes a rating from
   depth + cpLoss, builds game-sourced `RawPuzzle`s (with `noSetupMove`,
   `conceptHint`, `sourceLabel`, `sourceGameId`), and filters per skill.
3. **`src/services/adaptiveEndgameService.ts`** (extend) — `RawPuzzle` gains
   optional `noSetupMove` / `conceptHint` / `sourceLabel` / `sourceGameId`.
   `pickAdaptivePuzzle` gains `extraPuzzles` + `preferExtraEvery` so a fraction
   of picks come from the (small) game pool; game puzzles bypass the
   popularity/plays floors. `adaptivePuzzleToLessonPosition` handles
   `noSetupMove` (fen is already student-to-move; no setup ply is played).
4. **`src/hooks/useAdaptiveEndgameSession.ts`** (extend) — accepts
   `extraPuzzles` + `preferExtraEvery`, threaded into every `pickAdaptivePuzzle`
   call via a ref so picks always see the latest loaded pool. Default empty →
   the Endgame page is byte-for-byte unchanged.
5. **`src/hooks/useGameCalculationPuzzles.ts`** (new) — async loads the
   game-sourced RawPuzzles for a skill.
6. **`src/components/Coach/CalculationTab.tsx`** (wire) — loads game puzzles
   for the chosen skill, passes them into the session, surfaces a small "N
   from your games" line.

## Blend policy

`preferExtraEvery = 2`: roughly every other pick prefers an unplayed
game-sourced puzzle when one exists in the pool, else falls through to the
static adaptive pick. Fresh user with zero game puzzles → identical to today
(pure static). The first puzzle at mount is static (extras load async); the
blend kicks in from the next pick, so no board-swap jank.

## Status

- [ ] classifier + tests
- [ ] game-puzzle source service + tests
- [ ] adaptiveEndgameService extension + adapter test
- [ ] hook + tab wiring
- [ ] ship-check + audit + draft PR
