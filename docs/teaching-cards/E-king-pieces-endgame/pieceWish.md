# Card — `pieceWish` (your worst piece and the square it wants)

## A. Identity
- `src/services/pieceWish.ts:44` `pieceWish(fen, viewer, lastTo)` over `nextPlans.findWorstPlacedPiece` / `worstPieceRoute` / `worstReason`. Registry `boardComputers.ts:~5727` (entry ends `:5733`, kind `worst`). From move 10 (:45).
- Census: 21 fired / 7 said (held already-said 5, **unsupported 4**, same-idea 3).

## B. Facts
- **B1** `PieceWish` (:28): `square`, `piece`, `target`, `via[]`, `text` ("Your knight is stuck on the rim. It wants f4, an outpost no pawn can chase it from…"), `kind` (WorstKind: bad bishop, rim knight, …).
- **B2 dropped**: `r.aim` is in prose only; scope before/after (pieceScope) not handed; the route length (`via.length` = tempi).
- **B3 cheap**: `scopeNow`/`scopeThere` (`pieceScope` on fen and on a probe with the piece on target); `tempi = via.length + 1`; whether the student's played move was a step of the route (route `via[0]` = move.to).
- **B4 gates**: move ≥10 (:45); a worst piece exists, not `no-file-rook` (:48); not the piece that just moved (`lastTo`, :48); a route exists (:50).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Your knight is stuck on the rim. It wants f4, an outpost…" — specific; reads as a standing state | the rule ("Improve your worst piece") as lead |
| CONSEQUENCE | partly | `r.aim` ("where it sweeps a long diagonal instead of 3 squares") | — |
| BETTER MOVE + JOB | partly | `target` names the square (the student's next move → held in Learn) | once past: the better move IS the first step |
| HABIT | no | — | record `misplaced-piece` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PW1 | PLAN (improve worst) | S | student's move cost (positional) and the better move is the first step of the wish route | piece, from, target, aim | "Improve your worst piece: the {piece} on {from} {reason}, and on {target} it {aim}." / "When there's nothing to attack, the plan is your piece doing least." | "Until it moves, you play a piece down." | "{best} started the {piece} toward {target}." (once past) | "On every quiet move, ask which piece is doing least." | "When there's nothing to attack, improve the piece doing least — your {piece} on {from}." (target held while still playable) | best ≠ route step (then it isn't this cause) | C |
| PW2 | STRAT | S | the student's move made a GOOD piece better while the worst stayed (cost) | — | "Moving a good piece to a better square helps less than moving the worst one at all." | — | as PW1 | PW1 | "Your move improved a good piece while the {piece} on {from} stayed worst." | the played piece is the worst piece | C |
| PW3 | KNOW (rim) | S | PW1 fires AND kind = rim knight (a knowledge clause on PW1's turn, never alone) | — | "A knight on the rim is dim: from the edge it covers half its squares." | — | — | — | — | — | H kind |
| PW4 | KNOW (bad bishop) | S | PW1 fires AND kind = bad bishop (clause on PW1's turn) | — | "A bishop behind its own pawns is a tall pawn: move the pawns or move the bishop." | — | — | — | — | badEnemyBishop's own card covers theirs | H |
| — | phase | — | move ≥10; endgame king trips go to kingActivityGap | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Your worst piece is the {piece}." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `misplaced-piece` / `no-plan` (`bestJobReason`, `positionalReason.ts:223` "The knight belonged on e5") → PW1/PW2.
- Learn holds `target` (`namesStudentMove`) until the move is past.

## F. Build changes
1. `pieceWish.ts:28` — add `scopeNow`, `scopeThere`, `tempi`, `aim` typed.
2. Fact `squares: [square, target, ...via]` so the 4 `unsupported` holds stop.
3. Recipe PW1/PW2 → `mistakeLesson.ts` (cause `positional:misplaced-piece` when bestSan's piece = worst piece). One claim with pieceRoute PR1.

## G. Proof boards
- `vc-_zT8aWZh2x0-55` `4r3/1p3pk1/p2prnp1/P1q1n2p/R2Q4/2N4P/1PP2PP1/3R1B1K` (rook e6 wants c6); `lines-2.jsonl#6499` (rim knight wants f4); guard `lines-0.jsonl#9746` (held unsupported).

## H. Open questions
- None.
