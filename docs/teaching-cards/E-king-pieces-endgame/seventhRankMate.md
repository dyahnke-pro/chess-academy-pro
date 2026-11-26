# Card — `seventhRankMate` (two heavy pieces on the seventh that cannot mate)

## A. Identity
- `src/services/seventhRankMate.ts:41` `seventhRankMate(fen, lines, student)`; helper `noMatingCheck` (:33). Registry `boardComputers.ts:7625` (standing-board read, kind `technique`). Both seats.
- Census: 8 fired / 6 said (held in-flux 2).

## B. Facts
- **B1** `SeventhRankMate` (:21): `attacker`, `heavies[]` (≥2 R/Q on the defender's second rank), `guard` (defender R/Q on its back rank), `touched` (the heavy the defending king touches), `text`, `squares`.
- **B2 dropped**: whether the guard or the touch is the reason that actually holds (both listed if both); the engine `mate` check result (:57) beyond the gate.
- **B3 cheap**: `pawnsOnSeventh` — the defender's pawns on its 2nd/7th rank the rooks can take (chess.js captures from the heavies) = what the rooks are FOR ("win material"); `thirdPiece` — an attacker minor/king that reaches a square covering the back rank or the touch square in ≤2 moves (BFS like `movesToBear`, kingSiege.ts:171) = "bring another piece in"; `deflect` — a check or capture that drags the guard off the back rank.
- **B4 gates**: defender's king on its back rank (:46); ≥2 heavies on the 7th (:49); no mating check for the attacker even given the move (:50); a guard or a touch (:53); no engine line mate within 3 (:57).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Two rooks on the seventh don't mate by themselves here: no check mates while their queen on c8 guards the back rank. Use them to win material or bring another piece in." — rule + example + what to do | — |
| CONSEQUENCE | partly | "Use them to win material" | which material (`pawnsOnSeventh`) |
| BETTER MOVE + JOB | no | — | the better move once past ("Rxb7+ took the pawn with check") |
| HABIT | no | — | record (mate/technique skill) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SR1 | KNOW (false mate hunt) | S attacker | condition true on fenBefore, student's move cost (a check that went nowhere / a mate try) | guard/touch | "Two rooks on the seventh mate only when the eighth rank is free: while their {guard} guards it, the rooks are for pawns, not mate." / "When the king touches one of your rooks, the seventh-rank mate is gone — take material instead." | "The checks just push the king around." | "{best} took the pawn on {sq}." (once past) | "Before hunting mate with rooks on the seventh, ask what guards the eighth rank." | "Rooks on the seventh don't mate while the back rank is guarded — your rooks were for their pawns." | a mate exists (engine) | H; C pawnsOnSeventh |
| SR2 | PREV (defender) | S defender | condition with student defending, student's move let the guard off the back rank / king step away from touching | — | "Keep the back rank guarded and the king next to a rook: that is all it takes to stop two rooks on the seventh." | "Without it, the doubled rooks mate." | "{best} kept the {guard} on the back rank." | "With their rooks on your second rank, never take the guard off your back rank." | "That took the guard off your back rank." | — | C (condition flips false on fenAfter and the attacker now mates) |
| SR3 | PLAN | S attacker | condition true on fenBefore, student's move cost (missed), errorWhy's better move brings `thirdPiece` in | piece | "Two rooks on the seventh plus one more piece is a mating attack: the {piece} was the one to bring." | — | "{best} brought the {piece} to the back rank." (once past) | SR1 | "The rooks on the seventh needed one more piece." | better move is not the third piece | C |
| SR4 | CONSEQ (deflection) | S attacker | condition true on fenBefore, student's move cost (missed), errorWhy's better move is `deflect` (pulls the guard off the back rank) | guard | "When one piece guards the back rank against your rooks, pull it away and the rooks mate: their {guard} was overloaded." | — | "{best} dragged the {guard} off the back rank." (once past) | SR1 | "Their {guard} was the only thing stopping your rooks." | better move not a deflection | C |
| — | phase | — | any phase; mostly endgames — fine | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "No rook mate while the back rank is guarded." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student attacker: `costReason` none / positional cost while chasing checks — `positionalReason` (gap) or the cost alone → SR1; `missed` (material grab on the seventh) → SR1 consequence.
- Student defender: `costReason` allowed + mate after the guard left → SR2.

## F. Build changes
1. `seventhRankMate.ts:21` — add `holds: 'guard' | 'touch' | 'both'`, `pawnsOnSeventh: Square[]`, `thirdPiece: {square, moves} | null`.
2. SR2 needs the read on fenBefore vs fenAfter (registry passes the move) — add a move read beside the standing one.
3. Recipes SR1/SR2 → `mistakeLesson.ts`. The current text is a good LESSON stem source; keep its rule sentence, drop the board list.

## G. Proof boards
- SR1: `vc--Y5bZoD6TM0-48` `1kqr3r/pp2RR2/8/3p2Q1/2p3p1/2N3P1/PPP3B1/6K1 w` — "no check mates while their queen on c8 guards" (Danya: "Black pushes d5").
- SR2 shape: `lines-2.jsonl#1858` (student defending: "your rook on a1 guards the back rank, and your king on g1 keeps touching their rook on f2") — held in-flux.

## H. Open questions
- None.
