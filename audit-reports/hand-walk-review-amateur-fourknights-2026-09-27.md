# Review walk — amateur game G9hZ0VpT (Four Knights), Black's seat, 2026-09-27

66 narrated plies. **~59 of 66 clean (89%).** Every real error is flagged with its better move and, where the line proves it, the punishing line.

| ply | flag | root cause | fix |
|---|---|---|---|
| 12 (+ plies 11/17 in Carlsen–Aronian) | "Be6 develops into the game — the same idea as move 3" | a principle's `rule-stem:` identity fell through the commit loop and was read as a tactic motif named "stem" | only `motif:` identities transfer (`transferMotifOf`, tested) |
| 48 | "Checks, captured, threats" | the past-tense rewrite hit a method list | method lists and conditional races are prescriptive (not past-tensed) |
| 55 | "you got there first once the queens came off" — queens still on | the same rewrite past-tensed a conditional race | same |
| 73 | "Blockade it on a dark/light square" | template placeholder | names the square in front of the pawn |
| 95 | "an inaccuracy, costing about 9.2 points" | grade is win chances, number is centipawns; they part in a decided position | the number is dropped when they disagree |
| 72 | "passed pawns must be pushed" said by two lanes | — | OPEN |

## Re-walk (same game, after the fixes)
**~64 of 66 narrated plies clean (97%)**, up from 89%. No principle carries a transfer phrase; "Checks, captures, threats" reads right; the blockade names g5; no contradictory point cost. Two left, both fixed after this run: the passer race's past form still asserted "you got there first" (the text was planRace's own review register, not the rewrite — now "you would get there first"), and "passed pawns must be pushed" twice on the push itself (the standing note skips the move that pushes it).
