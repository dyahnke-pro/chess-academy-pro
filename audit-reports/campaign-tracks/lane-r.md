# Lane R — Intermediate endgame cards (2026-10-22, overnight)

Branch `lane-r` (worktree `agent-ace237f3c841b2dc0`), not pushed. Two commits:
`3304e7a90` (Level 24) and `1cd5c2cd8` (Level 22). `npx vitest run src/missions`:
377 passed, 1 skipped. `npm run typecheck`: 0 errors. ESLint on my files: 0 errors.

**The new instrument.** Both libraries rest on the **lichess endgame tablebase**
(Syzygy, exact for ≤ 7 pieces, a JSON query; `scripts/scenarios/lib/tablebase.mjs`)
plus **Stockfish 18** (one process, every read capped by nodes and a watchdog;
`lib/engine.mjs`). The tablebase gives the exact verdict of every legal move.
Stockfish is the second instrument the brief asks for: a board is kept only when
the engine agrees.

## 1. `rook-cut-off` — Level 24 endgame, "Cut the king off" — BUILT

- **Scenario.** Rook and pawn against rook. The student (rook and pawn) is to
  move, and the defending king is not yet cut off. 30 boards per colour, pawns
  on the b to g files. The Black boards are the White ones mirrored, then
  checked again with both instruments.
- **Verified on every board.**
  - Tablebase: the start wins. The ONLY winning moves (1 to 3 of them) are rook
    moves that cut the king off: the rook's file lies strictly between the
    king's file and the pawn's, and no enemy piece attacks the rook. Every such
    move wins, so no "cut" draws. The one-step pawn push (the natural wrong
    move) draws.
  - Stockfish, from the student's side: after the cut +4.0 to +4.8, after the
    push 0.00 to +0.13.
  - Builder stats: 4,363 tries, 1,126 rejected by the tablebase, 0 rejected by
    Stockfish.
- **Check** (`checks/rookCutOff.ts`, LIVE, pure). It judges a student move only
  when the board before it is a library board. The verdict is read from the
  library, never guessed.
  - PASS: one of the board's winning cuts.
  - MISS `pushed-before-the-cut`: a pawn move.
  - MISS `king-not-cut-off`: any other move. The phrase is always true, because
    every move that cuts the king off wins.
  - ShowMove: the engine's candidate among the cuts, otherwise the tablebase's
    best.
  - EXEMPT: any board not in the library (a watcher, or a scenario that did not
    load).
  - A forgiven decision ends the card `incomplete`.
- **Briefing.** The demo plays a library cut, then a tablebase-winning line in
  which the student pushes whenever a push still wins. The try is another
  library board, and its answers are that board's cuts.
- **Tests.** 17 check tests and 6 library tests:
  - every cut on every board passes;
  - the push and a king move each miss;
  - **fail twins**: a rook move one file beside the cut misses; the same cut on
    a board the library does not hold is never passed; a live game is never
    judged;
  - the runner's rewind and miss-shown flow;
  - the library rule re-checked with chess.js, with a negative control.

## 2. `wrong-rook-pawn` — Level 22 endgame — BUILT. The student is the DEFENDER

**Seat decision.** The student takes the bare king. The lesson "run to the
corner, and hold" is the one a student can act on. The attacking side has no
single habit to teach: it simply cannot win.

- **Scenario.** The coach has king, bishop and an a- or h-pawn, with the bishop
  on the wrong colour for the promotion square. The student's king starts two
  or three steps from the corner. 14 boards per colour; the White boards mirror
  the Black ones and are checked again.
- **Verified on every board.**
  - Tablebase: the start draws, and at least one natural move loses. Every
    drawing move keeps or shrinks the distance to the corner.
  - Stockfish, from the student's side: after the move toward the corner it
    reads -0.4 to -1.1 (the coach is a bishop and a pawn up and the engine sees
    no win). After the natural wrong move (the losing move nearest their pawn)
    it finds a forced mate, or reads at least -7.6.
- **Verdict tree.** The library stores the tablebase's drawing moves at the
  first decision. It also stores them at the second decision, after **every**
  coach reply to each drawing first move: 450 positions for the 14 Black boards
  (12 to 77 per board).
- **Fortress proof** (`prove-wrong-rook-pawn-fortress.mjs`). Once the defending
  king is in the corner zone, the coach can never win. Checked exhaustively in
  all four orientations, with and without the bishop: 33,912 placements and
  524,145 coach moves per orientation, 0 failures. The suite samples it again.
- **Check** (`checks/wrongRookPawn.ts`, LIVE, pure).
  - PASS: the student's king steps onto the promotion square while the board
    still poses the question.
  - MISS `lost-the-corner-race`: a move outside the drawing set at a decision
    the library holds, meaning the first or second decision. It shows the
    drawing move nearest the corner.
  - EXEMPT: decision 3 onwards, or any board off the library. There only the
    pass is judged.
  - Forgiven moves are walked past.
  - Taking their pawn ends the card `incomplete`: the draw is held, but the
    habit was not shown.
  - The card closes after 12 moves.
- **Briefing.** The demo runs from a library board to the corner in three
  plies. The try's answers are that board's drawing moves.
- **Tests.** 22 check tests and 7 library tests:
  - every losing move at every stored second decision misses;
  - every corner step after every coach reply passes;
  - **fail twins**: the same corner step with the right-coloured bishop; a step
    next to the corner; the student holding a piece; a decision off the
    library;
  - tree completeness: every coach reply has its node, with a negative control.

## 3. Level 20 "Lucena with a rook pawn" — NOT BUILT

The brief allowed it only once both cards were green. They were green late,
with the machine out of memory and its load average around 20 to 37. I could
not find an honest single decision without first checking the theory against a
source. The Lucena bridge is known not to work with a rook pawn, so I am not
sure what habit the card is meant to teach. Empty > invented.

## Arrival

Both cards start from a scenario, so the target is on the board every time the
endgame phase loads it. I did not measure them in-app (no audit game was run
tonight).

## For the lead

- **Shared edits:** I appended two entries and their imports to `registry.ts`,
  and two providers to `scenarios/index.ts`.
- **New union members:** both added from my own check files.
  - `MissionIdMap`: `rook-cut-off`, `wrong-rook-pawn`
  - `MissReasonMap`: `pushed-before-the-cut`, `king-not-cut-off`, `lost-the-corner-race`
  - `ScenarioIdMap`: `rook-cut-off`, `wrong-rook-pawn`
- **Dials.** Both cards use `LEVEL_1_DIALS` unchanged.

## Open questions for David

1. **After the pass the game plays on.** For `wrong-rook-pawn` the rest is a
   dead draw: up to 50 moves of shuffling. Should a pass end the scenario game
   as a draw?
2. **`rook-cut-off` grades a single decision**, the first move. Converting the
   win afterwards is later technique, and that rook-and-pawn work is Lucena's
   job.
3. **The tablebase is now an instrument.** It is reachable from here and only
   used offline. Is that fine as the standard for future endgame libraries?
