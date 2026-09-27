# Review walk — Carlsen–Aronian (ULAgpMaX, Ragozin), White's seat, 2026-09-27

Muted overhaul audit on localhost, full game (105 narrated plies). **~92 of 105 clean (88%).**

| ply | flag | root cause | fix |
|---|---|---|---|
| 97, 141, 147 | "You: that was an inaccuracy, costing about 0.7 points." — nothing else | the deeper search's best move WAS the move played; `bestMove` was nulled but the shallow label stayed | when the deep search explicitly plays the move, the verdict returns to good (all four refinement sites; a FAILED search never demotes) |
| 14, 29, 54, 93, 126 | "an attack on your king" as a plan at move 7 and in a rook endgame | king-attack aim had no phase | king-attack / shield aims need both queens and move > 10 |
| 11, 17 | "— the same idea as move 2" hung on a development sentence | transfer phrase mapped to the wrong part | OPEN |
| 85 | Rb8+ then "seize the open a-file" | file plan read after the rook left it | OPEN |

Tests: `gameAnalysisService.deepAgrees.test.ts` (with a real negative control — the first draft passed vacuously and was caught), `planArc.test.ts`.

## Re-walk (same game, after the fixes)
**~93 of 98 narrated plies clean (~95%)**, up from 88%. Every flagged ply now names its better move; no bare verdicts. King-attack plans now appear only with queens on in the middlegame, and the four that remain are true (a6/axb7 against a king on b8). Still open: the transfer phrase at ply 11 on a development sentence; the file plan at 85.
