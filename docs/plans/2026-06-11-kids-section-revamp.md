# Kids Section — Up-to-Standard + More Fun Games (2026-06-11)

Branch: `claude/kids-section-audit-lg0ewb` (PR #714). Living doc.

## Done
- **HIGH puzzle pipeline** (`6c4266e`): solver-side `movingPiece` re-tag (15k), kid puzzle
  orientation fix, kid-safe `KidPuzzleBoard` (no coach-state coupling).
- **MEDIUM board + narration** (`ea0e589`): all 6 games on `KidChessboard`; QueenVsArmy/
  QueensGauntlet intro narration; PieceMazePage voice cleanup.
- **Puzzle realism audit**: `scripts/audit-kid-puzzle-realism.mjs` (gate, exit 1 on findings)
  — catches illegal pre-check setups, ambiguous mate/check, goal/hint mismatch. Fixed
  queen-puzzle-2/3, king-puzzle-1, tactics-puzzle-3 in both chapter files; `altSolutions`
  (JourneyPuzzle) accepts multiple correct first moves. Green (0 findings).

## Next

### Phase B — Queen's Gauntlet rebuild + reusable one-piece-vs-many engine
- Rebuild `QueensGauntlet.tsx` clean; extract a generic gauntlet engine so the same code
  drives a gauntlet for ANY piece (David loves "one piece against many").
- Route properly: kill QueenGamesHub `setView`; add `/kid/queen-games/gauntlet`.

### Phase C — More fun games (gauntlets, mazes, time trials, races)
Idea bank (chessworld.net, acornchess, littlechesschamps, exeter chess club):
- **Gauntlet family**: "[Piece] vs Army" — one rook/bishop/knight/queen captures all pawns
  before they promote (generalize Queen vs Army).
- **Races / time trials**: Pawn Promotion Race (escort a pawn home); "clear all targets
  before the clock" time-trial variant of mazes/sweeps.
- **Capture-order**: Knight's Snooker / Pawn Mower — capture every move in the right order.
- **Knight Adventure**: 4 corners and back / collect targets.

### Phase D — Hub polish
- 6 piece hubs → identical shape (gap-4 vs gap-6, loading/lock states).
- Welcome narration on MiniGameHubPage + GuidedGameHubPage.

## Guardrails (kid non-negotiables)
KidChessboard only; LLM writes ZERO chess content; no SAN in kid text; milestone-only praise;
Ruth default voice; no coach-state coupling; chess.js validates every move; new puzzles MUST
pass `audit-kid-puzzle-realism.mjs`; new games = deterministic, voice = intro + milestones.
