# Lane KP — Intermediate endgame: Outflanking (L19), Triangulation (L21)

Branch `lane-kp` (worktree `agent-a936316af8a325676`), not pushed. Both cards
BUILT: `7be0ff274` (Outflanking), `e9a5cdbd1` (lazy decision read),
`d1f631153` (Triangulation). `npx vitest run src/missions` green (37 files + 1 skipped),
`npm run typecheck` 0, `testOnlyExports` gate green, eslint clean.

## The shared judge — exact verdicts, no engine in the check

`src/missions/checks/kpEndings.ts` reads verdicts shipped as data
(`kpTables.json`, 61 KB): "how the check knows win vs draw" = an exact table,
never a guess; a board outside the tables reads `null` = not judged.

- **K+P vs K, every position** — a 24 KB bitbase solved by retrograde analysis
  (`scripts/scenarios/kp-tablebase.mjs`); `kpEndings.test.ts` rebuilds it and
  checks all 364k legal placements bit for bit.
- **Slices** — one fixed pawn set, the kings anywhere, either side to move:
  six blocked pawn pairs (solved locally) and the triangulation structures
  (solved by `kp-slice.mjs`, every pawn move / capture out of the structure
  read from the K+P tables or Syzygy). Black boards read the colour mirror.
  A test replays EVERY placement of the shipped structures and asserts each
  verdict is the minimax of its children, none unknown.
- **Promotions** judged on the move by a rule (the new Q/R wins unless the lone
  king can take it or is stalemated), PROVED against exact K+Q and K+R tables
  on all 447,888 positions. `kp-selfcheck.mjs`: tables' move generation and
  verdicts vs chess.js; the slice solver vs the independent pair solver
  (13k placements); 0 disagreements.

## Card 1 — `kp-outflanking`, Level 19 endgame

**Scenario** `kp-outflanking`, 52 boards a colour (Black = colour mirror).
Rule (`kp-outflank-rule.mjs`, applied exhaustively over the tables): a won K+P
vs K or blocked-pair ending, the kings FACE each other (same file, their king
two ranks in front), the student to move, and ONLY a king sidestep (same rank,
one file across, no capture) keeps the win — the pawn run, the retreats and
the wrong-way sidestep all draw. `trap` = the pawn run where the pawn can
move, else the drawing king move nearest the target.

**Verified** (`build-kp-outflanking.mjs`, aborts on any disagreement): Syzygy
agreed on every board and every child, both colours; Stockfish (1 thread,
depth 32 / 2.5M nodes) read every start ≥ +3.00 and every drawing move ≤ +0.60
(White boards), start + trap on every mirror.

**Check** (`checks/kpOutflanking.ts`, definitions in the header): PASS a queen
(or rook) that survives; MISS `faced-the-king` on the decision board, MISS
`kp-win-slipped` on any other won board (shows the key sidestep on the library
board, else the engine's first winning candidate); EXEMPT forgiven / unsolved
/ coach moves; OVER = incomplete. Posed from the library board, or (live game,
watcher) only from the first decision board. `foundAt` = the winning sidestep.
Briefing: demo Ke5+Pc6 v Ke7 (Kd5! … c8=Q+, the exact line), try Ke6+Pe5 v Ke8.

**Tests**: `kpOutflanking.test.ts` 24 (fail twins: the spare-tempo board where
e3 also wins, the rook-pawn draw, the defender to move, kings not facing, the
wrong-way sidestep, a promotion their king takes), `scenarios/
kpOutflanking.test.ts` 5, `kpEndings.test.ts` 9.

## Card 2 — `kp-triangulation`, Level 21 endgame

**Scenario** `kp-triangulation`, 32 boards a colour, on the pawn skeleton of
the app's own triangulation lesson (`pawn-endings.json`: b5 + c4 v b6) and its
other-wing mirror. Rule (`kp-tri-rule.mjs`): the student to move and winning;
the same board with the defender to move also lost for them (zugzwang); every
winning move a king move inside the structure; the direct approach (a king
move toward their pawn) draws; EVERY winning move starts a king triangle
(k0→k1, the defender out, k1→k2, back, k2→k0 = the same board, defender to
move). The lesson board itself is in: only Ke5 wins, triangle e4–e5–d5–e4
against c7–d7–c7, Kd5 / Kd4 / c5 draw (matches its own tablebase note).

**Verified**: the structure solved exactly (6,292 placements; 3,311 exits from
Syzygy, the rest local); 16 base boards × 4 variants all confirmed by
Stockfish (start ≥ +3.00, direct approach ≤ +0.60) and every variant's every
child agreed with Syzygy. None left out.

**Check** (`checks/kpTriangulation.ts`): PASS = the BREAK — the first capture
or pawn move that keeps the win (exact); MISS `no-triangle` on a decision board,
`kp-win-slipped` elsewhere; EXEMPT as above, plus a board the shipped slices do
not cover (the defender broke the structure somewhere unsolved). Live posing
needs the library's structure (either wing / colour). `foundAt` = the king back
on its square with the same board and the defender to move. Briefing: demo =
the lesson board, the triangle then the exact line to Kxb6; try = Kc8 version.

**Tests**: `kpTriangulation.test.ts` 19 (fail twins: defender to move, a board
where Kxb6 wins at once, Kf5 — a step forward that is not the move), `scenarios/
kpTriangulation.test.ts` 4, plus the minimax sweep in `kpEndings.test.ts`.

## Decisions (mine — David may overrule)

1. **PASS for Triangulation is the break, not the queen.** Judging to the queen
   would need the K+2P v K and freed-passer endings shipped too; the break is
   where the handed-over move pays off and every verdict up to it is exact.
2. **`foundAt`** pays the technique itself (the sidestep; the king home with the
   move handed over); the pass comes at the queen / the break.
3. **The fastest win is NOT required to be the triangle**: on the lesson board
   Syzygy's quickest win is 13 plies while Black-to-move lasts 16 — the
   triangle is the human plan, not the engine's shortest line.
4. Dials: `LEVEL_1_DIALS` unchanged; `graduate.firstTryPasses` 4 (L19+).

## Open questions / for the lead

- **Bundle**: `kpTables.json` (61 KB) is imported statically through the
  registry. Lazy-load it if the main chunk matters.
- **Defender strength in scenario endings**: the coach defends at the student's
  strength; a weak defence lets the student win without the technique after the
  first decision (that decision is always judged). A stubborn-defence dial for
  endgame scenarios is David's call (§6 tier tables are TO FILL).
- Track order: both cards `unlock.after: []` — `missionForPhase` serves them
  after `kq-mate` graduates; the track plumbing decides when.
- In flight at writing: the same skeleton one file over (c5 + d4 v c6) is being
  solved for more variety; if it lands it is a separate commit.
- `tsc -p tsconfig.tests.json` OOMs at the default heap on this machine; my test
  files type-check clean with a scoped config (one unrelated global error).
