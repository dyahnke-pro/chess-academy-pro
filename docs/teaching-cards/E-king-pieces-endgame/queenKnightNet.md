# Card — `queenKnightNet` (queen and knight closing the net)

## A. Identity
- `src/services/queenKnightNet.ts:47` `queenKnightNet(fen, lines, student)`; helpers `kingSquares` (:23), `covered` (:39). Standing-board read on the engine's best line (first four moves of the favoured side). Registry `boardComputers.ts:7740`, kind `king-read`.
- Census: 3 fired / 3 said.

## B. Facts
- **B1** `QueenKnightNet` (:21): `side`, `king`, `queen`, `knight`, `ply` (index in the line), `text`, `squares [king]`.
- **B2 dropped**: `free` (0 or 1 squares left, :64), `noQueen`/`noKnight` (squares free without each piece, :67-68) — the proof that both are needed, said only as "neither piece could do it alone"; the line's moves up to `ply` (the route that builds the net); `top` score (:52).
- **B3 cheap**: the defender's ANSWER — a move on the board before the line that keeps ≥2 king squares free (the same `covered` count after each legal defender move) = the defence lesson; whether the net ends in mate within the line (play to `isCheckmate`).
- **B4 gates**: best line favours a side by ≥150 cp or mate (:53); within that side's first four moves (:59); exactly one queen + a knight (:63); king left with ≤1 square (:65); removing either piece frees ≥2 squares (:69); both actually hit a king square (:72).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "the queen takes some squares and the knight the rest" — a geometry nugget; the defender stem adds "keep your cover pawns where they are" | the general rule first; which squares each covers |
| CONSEQUENCE | partly | "left with one square" | mate or material at the end of the line |
| BETTER MOVE + JOB | no | — | the defence (B3) / the attacker's first move once past |
| HABIT | no | — | record `missed-their-mate` / `weakened-king-safety` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| QN1 | KNOW (geometry) | S defender | their net in the line, student's move cost (allowed) | king | "Queen and knight are the deadliest pair near a king: the knight covers the squares a queen can't, so together they leave {king} with nowhere to go." | "{left} for your king, and mate follows." | "{defence} kept two squares free." (once past) | "When their queen and knight are both near your king, keep your pawn cover and trade one of them." | "A queen and a knight together cover every square a king can run to — that's what your king walked into." | line not favouring them | H + C defence |
| QN2 | PREV | S defender | same | — | "Trade the knight or the queen: one of the pair alone can't make the net." | — | "{trade} broke up the pair." (once past, only when errorWhy's better move is that trade) | QN1 | "Trading one of the pair was the way out." | no trade legal; better move not a trade | C |
| QN3 | KNOW (attacker missed) | S attacker | net in the best line, student played otherwise (missed) | — | "With a queen and a knight near their king, look for the squares the queen can't reach — the knight takes those." | — | "{first move} started the net." | — | "With your queen and knight near their king, the net was there to close." (said only when `pastBetterNameable`; else a pointer → silent) | the net's first move still playable | H |
| — | phase | — | any (queen required) | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Queen and knight — watch your king." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student defender: `costReason` allowed + mate or big material with Q+N in the blow line → QN1/QN2.
- Student attacker: `costReason` missed → QN3.

## F. Build changes
1. `queenKnightNet.ts:21` — add `free`, `queenCovers: Square[]`, `knightCovers: Square[]`, `lineToNet: string[]` (SAN to `ply`), `endsInMate: boolean`.
2. Pure `netDefence(fen, defender, side)` — the defender's legal moves that keep ≥2 squares free (reuse `covered`).
3. Recipes QN1–QN3 → `mistakeLesson.ts`.

## G. Proof boards
- QN3 shape: `lines-2.jsonl#6275` ("the queen and the knight between them leave their king on e3 with one square left").
- No saved defender-seat board.

## H. Open questions
- None.
