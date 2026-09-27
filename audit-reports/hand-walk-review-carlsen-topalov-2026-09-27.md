# Review walk — Carlsen–Topalov (CA4oVUCt), Black's seat, 2026-09-27

Muted overhaul audit on localhost, real Stockfish, full 80-ply walk (run 2; run 1 wedged at ply 16 and did not reproduce).
Every narrated ply read against the board. **42 of 52 narrated plies clean (81%).**

| ply | flag | root cause | fix |
|---|---|---|---|
| intro | "it ended in a draw" on an unfinished game (`*`) | any non-decisive score defaulted to draw | only a drawn score reads as a draw; unknown names no result |
| 8, 16 (run 1) | "Newly undefended: their bishop on b5" beside "your pawn on a6 now eyes their bishop on b5" | the attacked-by-mover guard ran for the opponent's moves only | both seats: a piece the move attacks is the attack line's claim |
| 13 | 7.c4 "tears the centre open while your king is still in it" | the break hit b5, far from the e8 king | the opened line must be within a file of the king |
| 29 | "they take on h7, and you can take back" — …Rxh7 loses the rook to Qxh7 | trade line never checked the recapture | signed SEE ≥ 0, else "taking back would cost you more than the pawn" |
| 31, 43, 56, 69 | "They have let an attack on your king go" | plan-arc DROP events spoken | drops are silent; a plan leaving the engine line is not something a player did |
| 40 | "you were up a pawn and you have the bishop pair" | past rewrite missed possession | "you have the/a …" → "you had …" (modal "have to" untouched) |
| 78 | "Bb5 completes your development" on move 39 | rule had no phase | opening only (move ≤ 20) |

Kept (checked, true): 23 "a passed pawn on the h-file" as White's aim — it arrived at 29–31. 28 buried bishop — Rg6 (best) also drops h7.

Tests: `reviewWalkCT.test.ts`, `coachFeatureService.introResult.test.ts`, `reviewRegister.test.ts`, `reviewFullData.test.ts` (loose facet), each on the game's own positions with a negative control.

## Re-walk (same game, after the fixes)
**48 of 50 narrated plies clean (96%)**, up from 81%. Every fixed class gone; intro now "— you had Black." Left: 78 "Bb5 develops into the game" (the sibling development rule, same missing gate — now both rules require the piece to leave its STARTING square), 52 "your plan is taking shape: an attack on their king" (vague in a rook endgame, watch).
