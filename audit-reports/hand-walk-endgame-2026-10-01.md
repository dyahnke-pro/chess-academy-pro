# Hand walk — /coach/endgame (2026-10-01)

Walked by hand on localhost (muted hand-page driver), every tab, flags first,
fixes after. David: "We need a good sweep of that page … It's pretty jacked up."

| # | Where | Flag |
|---|---|---|
| E1 | Mating → Piece Mates | Labelled "Recognition only — practice corpus coming soon"; they are playable. Named patterns with a playable lesson (Damiano's, …) also say "Recognition only". |
| E2 | Rook / Queen / Two-Rook / B+N mate | A single curated line forces one-answer mode ("Not the move") — the code's own comment says basic mates have no single correct technique and should be free play. |
| E3 | Mating intro voice | Method said twice: the authored intro, then the computed rule saying the same. |
| E4 | Rook mate | "Rh1 keeps an edge" — a move that still forces mate called "an edge" (strict mode). |
| E5 | Damiano's Mate | "A pawn or bishop **pins** the king to a square" — misuses pin. |
| E6 | Damiano's Mate | "bring the queen to h8" — the mate is on h7 (supported by the g6 pawn). |
| E7 | Mating, solved | "Line completed. The geometry is the same…" — nothing spoken, nothing about WHY it is mate. |
| E8 | Principles / Drawn | "7,188 drill puzzles" on four unrelated principles — the general endgame pool presented as principle-specific. |
| E9 | Two Weaknesses | "Once both sides have weaknesses" — means both flanks; reads as both players. |
| E10 | Two Weaknesses | The line (Kd3 Kd7 Ke3 Kc6 Kd4 Kb6 Ke4 Kc6) never attacks a6 and never plays g4-g5 — does not show the narrated plan; "White wins" is unverified (`auditSkip`). |
| E11 | Key Squares rule | "For a rook pawn, there are no key squares — the pawn only draws" — false. |
| E12 | Triangulation | "three of your moves and one of your opponent's" — the defender spends two. |
| E13 | Key Squares rule | "two ranks ahead" only holds up to the 4th rank. |
| E14 | Key Squares why | "from any of them the white king controls e7 **and e8**" — no 6th-rank king covers e8. |
| E15 | Philidor (Rook + Drawn tabs) | Rook drops back "when the pawn reaches the 5th" — it is the 6th (the defender's 3rd rank). |
| E16 | Vančura | "the SIDE of the 3rd rank (from the pawn's POV), pawn distance away" — garbled. |
| E17 | Stalemate Stalking | "If the opponent doesn't give you a check or capture, it's stalemate" — wrong definition. |
| E18 | Perpetual Check | "Repeat the sequence three times" — it is the same position three times. |
| E20 | Q vs R Fortress | The keystone is a plain Q vs R **win** (tablebase) — no fortress shown in Drawing Patterns. |
| E21 | Philidor keystone | Attacking king already on the 6th, defending rook not on its 3rd rank, student plays the attacker — not a Philidor set-up. |
| E22 | Stalemate Stalking keystone | Already stalemate on the board — shows the result, not the plan. |

Verified true on the walk: key-square keystone (Kd6 / Kf6 / e5 all win, tablebase);
wrong tries refuted on curated mates ("Qh6? Then …gxh6 — they come out the queen up").

## Tablebase sweep of every lesson keystone (≤7 pieces) — after the walk

`scripts/endgame-drills/verify-lesson-keystones.mjs`: the claimed result at the
start, and every move of the line keeps it. 9 lessons taught a result the
tablebase contradicts; 8 rebuilt on tablebase-verified lines:

| Lesson | Was | Now |
|---|---|---|
| Philidor (Rook tab) | "draw" — the rook stood en prise, Rxe3 wins | Rb6 e6 Rb1 Kd6 Rd1+ Ke5 Re1+, student defends |
| Philidor (Drawn tab) | student played the attacker | same verified line |
| Q vs R fortress | a plain Q vs R win | rook g6 / pawn f7 / king g7, a real fortress |
| Key squares #2 | "1.Kd6 first wins" — a draw | the honest lesson: too late, stalemate |
| Rule of the square #3 | "a4 wins" — a draw | king on g3: a4 wins, a3 draws |
| Outflanking | "Kc6" — throws the win away | Kd4! Kd6 e3 |
| Vančura | lost even with Black to move (rook behind the pawn) | white rook in front, Black holds |
| Trade when ahead | a draw | a pawn up, the king collects a7; e6? draws |
| Perpetual check | illegal position, "up a rook" with no rook | two rooks + pawn vs queen, only checks hold |
| Triangulation | still a draw — **OPEN**, needs a true mutual-zugzwang position | — |

Stalemate Stalking (E22) rebuilt too: 7k/8/5KQ1/8/8/8/8/r7 b — the king has no move, only
Ra6+ draws (the desperado rook), tablebase-verified.

## Engine check of the >7-piece lessons (`verify-lesson-keystones-engine.mjs`, Stockfish 18 d22)

breakthrough +6.1, opposite-colour bishops −5.8 (claims black wins), activate the king +5.2,
attack weak pawns +8.0, don't rush +7.5 — all hold at the start and the line end.
**Two Weaknesses was 0.00 — a dead draw claiming a win (E10).** Rebuilt: the same pawns with
White's king already on e4 (+6.3); the line Kd4 Kd7 Kc5 a5 bxa5 Kc7 g4 Kb7 Kd6 ends +9.5 and
shows the plan (queenside target, then the g4 lever). From e2 the same pawns only draw.

## Puzzle counts (E8)

Lessons tagged only `endgame` now say "mixed endgame puzzles" instead of implying the pool
drills that principle.
