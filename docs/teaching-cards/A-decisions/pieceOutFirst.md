# pieceOutFirst — the piece out before its pawn shuts it in

## A. Identity
- `src/services/pieceOutFirst.ts:30` `pieceOutFirst(fenBefore, san, follow)`; read in two registry entries: `outFirst` `boardComputers.ts:6260-6278` (kind `move-order`, weight 72, claim `out-first:<sqs>`, 2 rotated stems) and `moveGains` :2529-2585 ("brings the bishop out before …e6 closes its road").
- Census 7/7 (lesson 4, review 3).

## B. Facts
- B1: `{ pawn, piece: 'bishop'|'queen', squares: [from, to, pawnTo] }` (:12-17).
- B2 dropped: the follow-up index `k` (how many moves later the pawn came, :42); the road squares (:38).
- B3 cheap: the INVERSE — the student played the pawn first and the bishop is now shut in: on the student's move (a pawn push), find a home bishop whose road `between(from, bestSquare)` the pawn now blocks; compare bishop mobility before/after (chess.js). That is the mistake case.
- B4: mover's B or Q, non-capture, from home rank (:35-37), road non-empty; a later own pawn push (within 8 plies, non-capture) lands on the road and was legal before (:42-53).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "The bishop comes out before …e6, which would have shut it in" | fires on GOOD moves only |
| CONSEQUENCE | no | — | for the inverse: "your bishop on c8 now has N squares" |
| BETTER MOVE + JOB | no | — | inverse: "…Bf5 first, then …e6" |
| HABIT | no | — | "Before a pawn push, ask which piece it shuts in." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PO1 | knowledge (move order) | both | today's fire | piece, pawn | "Bring the bishop out before the pawn that would shut it in." | — | — | — | Review/lesson only (fires on good moves; Learn is mistakes-only) | | H |
| PO2 | counterfactual (inverse) | S | student's pawn push cost ≥ mistake AND B3 finds the bishop shut in (mobility drop ≥ 3) AND the best move was that bishop | bishop, pawn sq | "Get the bishop out before the pawn that blocks it. Your pawn on {sq} now walls in the {colour} bishop." | "It has {n} squares left, all behind your pawns." | "{best} first, then the pawn." | "Before a pawn move, ask which of your pieces it shuts in." | after move | best must be that bishop's move | C |
| PO3 | their seat | O | inverse for opponent | | "They shut their own bishop in: the pawn on {sq} blocks its road." | "That bishop will be a poor piece for a long time." | n/a | — | Learn: say on their mistake | | C |
| PO4 | record | S | | | RED/GREY PO2 · AMBER "Bishop out before the pawn." · GREEN silent | | | | | | H |
| — | phase | — | opening only (home-rank bishops) | | | | | | | | |
| — | calculate, prevent, endgame | — | n/a | | | | | | | | |

## E. Mistake link
- Principle `buried-own-bishop` (principleVoice) is the same cause: PO2 is its lesson. positionalReason `piece-offside` is close. Today pieceOutFirst never attaches to a mistake (fires on the good order only).

## F. Build changes
1. New pure `pawnShutsBishop(fenBefore, san)` in `pieceOutFirst.ts` → `{ bishop, pawnSq, squaresBefore, squaresAfter }`.
2. Register PO2/PO3 under the cause `buried-own-bishop`; one recipe with principleVoice's `buried-own-bishop` verdict (subsume — same claim).
3. `pieceOutFirst` stays Review/lesson only (good-move teaching).

## G. Proof boards
- g:1001055178#4 O `…Bg4` loss 51 → follow …e6 (PO1, good order, Review only).
- g:1001055178#13 S `Bg5` loss 31 → follow f4 (PO1).
- No inverse case run (needs PO2's new helper).

## H. Open questions
- None.
