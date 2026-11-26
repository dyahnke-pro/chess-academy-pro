# inBetweenMove — the threat first, the capture can wait

## A. Identity
- `src/services/inBetweenMove.ts:67` `inBetweenMove(fen, pv, firstIsBest)`; also the tactic record (`missedTacticService` files a missed one as `zwischenzug`).
- Registry `notYet` `boardComputers.ts:5507-5551`, kind `not-yet`; two reads: on the move played (both seats, `{reads: fan}`) and prospective (`'best'`, names the student's move). Census 16/14.

## B. Facts
- B1: `{ capture, captureSquare, first, check, line }` (:15-27).
- B2 dropped: what the forcing move hit (the target in `forcing` test :81-88); the capture's net (`captureNet` :94).
- B3 cheap: the inverse mistake — the student CAPTURED at once when the in-between move was best: run `inBetweenMove(fenBefore, bestPv, 'best')`; if it returns and the played move is that capture (same square) and cost ≥ mistake → the student missed the zwischenzug. (`kneeJerk` overlaps when the capture was a recapture.)
- B4: first move non-capture and forcing (check, or new hit on a bigger/loose piece, :81-89); a capture worth making exists now (net ≥ 0, :94); the same capture appears later in the line on a mover ply (:96-98); with reads: taking now not ≥ 30 better (:101-106).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Taking on g5 can wait — it isn't going anywhere. The threat comes first" | fires on the good move; the mistake (took at once) not read |
| CONSEQUENCE | no | | what taking first allowed |
| BETTER MOVE + JOB | yes | first, check flag | |
| HABIT | no | | "Before you capture, look for a check or threat that comes first." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IB1 | knowledge (zwischenzug) | S | B3 inverse fires | sq, first kind | "A capture that isn't going anywhere can wait. The {check/threat} came first, and the piece on {sq} was still there after." | errorWhy: what taking first let them do | "{first} first, then take on {sq}." | IB habit | after move | B3 must prove the capture still there (line) | C |
| IB2 | their seat | O | they took at once and missed theirs | | "Grabbing at once can miss an in-between move. Their capture came before their check, so you get to answer first." | | n/a | | Review / Learn on their mistake | | C |
| IB3 | good move | both | today's fire | | Review/lesson only | | | | silent in Learn | | H |
| IB4 | record | S | | | RED/GREY IB1 · AMBER "The check came first." · GREEN silent | | | | | | H |
| — | endgame, plan | — | n/a | | | | | | | | |

## E. Mistake link
- errorWhy: IB1 → `missed-win` motif `zwischenzug` (E14); IB2 the O-seat of it; IB3 Review only.
- costReason `missed` motif `zwischenzug` (the one classifier files it); kneeJerk when the capture was a recapture (one recipe: IB1 subsumes KJ1, claim `not-yet:<sq>`).

## F. Build changes
1. Registry: a third read on the move played = the capture, using `inBetweenMove(fenBefore, bestPv, 'best')` → IB1/IB2.
2. Expose the forcing move's target (B2).
3. One claim with kneeJerk (`not-yet:<sq>`), so the turn says one of them.

## G. Proof boards
- g:1012441262#35 S `Bxf8` best `b4` loss 268, `r4rk1/ppp4p/3p2pB/nq1Pp2n/4P3/2P1Q2P/PP1N1PP1/R3K2R w KQ - 0 18` → the run returned `{capture Bxf8, first b4, line b4 Nc4 Qe2 Na3 Qxb5 Nxb5 Bxf8}`: the student took on f8 at once; b4 (hitting the queen on b5) came first → IB1 proof board.
- g:1012441262#29 S `d5` loss 12 → IB3 (good, silent).
- 17 hits, 5 on mistakes.

## H. Open questions
- None.
