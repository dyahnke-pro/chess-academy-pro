# Learn walk — Carlsen–Aronian (ULAgpMaX, Ragozin), White's seat at 1500, 2026-09-27

Hand driver on localhost, first 60 plies, coach's moves dictated. Every distinct line read against the board (SAN/spoken echoes and "Check." counted once).

**Walk 1: ~38 of 50 distinct lines correct (76%).**

| ply | flag | root cause | fix |
|---|---|---|---|
| 21 | "left the book with the pawn taking on g3; the usual move was the pawn taking on g3" (fxg3 vs hxg3) | spoken pawn capture dropped its file | `sayMoveNoun`: a pawn capture names its file ("the f-pawn taking on g3") |
| 15 | "Nxg5 falls apart" then "you've got a pin coming: Nxg5, hxg5, Bxg5" | lookahead scanned every engine line, including a losing one | only lines within a pawn of the best are scanned |
| 29–39 | a3/a4/a5/a6 "isolated" four times | say-once keyed on the square; concession compared squares | keyed by file (positional read, balance sheet, concession) |
| 35 | battery warning then "their rook on e8 and queen on e7 line up on the same e-file" | battery key held only its target square | every square the alert named counts as spoken this turn |
| 39 | "Ne4+, forking on e4" | named the landing square | names the forked pieces ("your knight on d2 and your king on f2") |
| 1–3 | "This game is the Indian Defense" twice | names compared raw; generic tail differs, speech doesn't | compared as spoken labels |

Open: the b4 pin re-read at ply 15 by a second lane; a spectator-register curated beat at ply 7 ("Black pins… this repertoire knows…"); a stray "Material is even" at ply 15.

Tests: `spokenMove.pawnFile.test.ts`, `liveTacticsContext.playable.test.ts`, `danyaBehaviors.forkNames.test.ts`, each on the game's position with a negative control.
