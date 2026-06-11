# Setup Trainer rebuild — calculation + tactics-spotting (2026-06-11)

**David** asked for two things on the Tactics tab:

1. ✅ **Reorder** — My Mistakes + My Weaknesses pinned to the TOP of
   `/tactics` (priority row). Done in `TacticsPage.tsx`.
2. 🔧 **Setup Trainer rebuild** — the old system rewound David's own games
   and made him replay the literal game line (arbitrary, fragile,
   "asks for one move then auto-plays the rest"). Replaced.

## Decisions (locked with David, this session)

- **Source = Lichess corpus** (`puzzles.json`, 15k, CC0, engine-verified)
  — NOT his games. ~1,000 genuine "quiet setup move → multi-move forced
  tactic" positions found by shape-filter (502 / 361 / 135 across the three
  depths; well-spread by rating).
- **It's calculation training mixed with tactics spotting** (David's words)
  — a quiet first move (non-capture, non-check) that sets up a real tactical
  motif, then he **calculates + plays the whole tactic to the end** (no
  passive "watch the reveal").
- **Harder = more moves / further out** (David) — difficulty = solver move
  count = calculation depth: L1 = 2 solver moves, L2 = 3, L3 = 4+.
- **Adaptive difficulty stays in effect** (David) — band-selected near
  `puzzleRating`, drifts on solve/fail (reuses K=32 `calculateRatingDelta`
  + a session bump/penalty), like AdaptivePuzzlePage.
- **No LLM deciding chess** — moves/tactic/type all from the corpus +
  chess.js. The only LLM touch is the optional, grounded, board-validated
  hint prose (shared app-wide hint system, gated by `showHints`).

## Files

- `src/services/setupTrainerService.ts` — NEW: shape filter, builder,
  adaptive selector. Replaces the game-rewind generator.
- `src/components/Tactics/TacticSetupBoard.tsx` — REWRITE: play every
  solver move (setup + finish), opponent replies auto-play.
- `src/components/Tactics/TacticSetupPage.tsx` — REWRITE: adaptive session
  over the corpus, level = calculation depth.
- `src/services/tacticSetupService.ts` — DELETED (dead after rewire; the
  game-rewind generator David suspected was "an old system").
- `src/services/tacticNarrationService.ts` — setup copy retuned to the
  calc framing.
- tests updated + new `setupTrainerService.test.ts`.

`SetupPuzzle` type / `setupPuzzles` Dexie store / sync / factory stay
untouched (no migration) — only the *source* of the puzzles changes.

## Status: in progress
