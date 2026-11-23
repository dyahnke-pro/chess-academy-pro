# readTiming — why it works now and not a move earlier

## A. Identity
- `src/services/moveTiming.ts:47` `readTiming(fenEarlier, fenNow, san)`; `timingClause` :73. Registry `timing` `boardComputers.ts:6045-6069`, kind `timing`, claim `timing:<san>`, both seats; skips captures/checks (:6048). Census 66/47.

## B. Facts
- B1: `{ san, reply, piece, square }` (:14-20).
- B2 dropped: `then.gain` (what it would have lost, :55), `nowWin` (:61).
- B3 cheap: the inverse mistake — the move played NOW loses material to a capture that a move LATER would not exist (premature): replay the same move one move later on the engine line (`bestPv`) board; if `bestWin` on the played board wins ≥ 2 and on the later board doesn't → "a move too early". Also the opponent seat: their premature move.
- B4: same side to move both boards (:51); move legal both (:53-54); a material-winning capture ≥ 2 a move earlier (:55, bestWin gain ≥ 2 :32); not already winnable earlier (:60); not now (:62); the saved piece still stands (:68).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "The timing of Bh6 matters — a move earlier, their pawn would have taken on h6 and won your bishop" | good-move only |
| CONSEQUENCE | yes | the hypothetical loss | |
| BETTER MOVE + JOB | n/a | | |
| HABIT | no | | "A good move played a move early can lose: check what it walks into now." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RT1 | timing (premature, inverse) | S | B3 fires, cost ≥ mistake | piece, sq, capturer | "The right move at the wrong time loses. Right now their {capturer} takes on {sq}; a move later it couldn't." | "You lose the {piece}." | "{best} first; then the move works." | RT habit | after move | B3 must show the later board safe | C |
| RT2 | timing (good) | both | today | | Review/lesson only | | | | silent in Learn | | H |
| RT3 | their seat | O | their premature move | | "They played it a move too early: the {piece} on {sq} can be taken." | | held | | Learn: pointer rule | | C |
| RT4 | record | S | | | RED/GREY RT1 · AMBER "A move too early." · GREEN silent | | | | | | H |
| — | plan, endgame | — | n/a | | | | | | | | |

## E. Mistake link
- whyItFailed `lost-the-piece` when the move is premature; costReason `allowed` blowPlies 1. RT1 is the "why now is wrong" angle of the same cause as blunderCheck BC1 — pick RT1 only when B3 proves a later board is safe (more specific).

## F. Build changes
1. Expose `gain` (B2).
2. New `tooEarly(fenNow, san, laterFen)` (B3) in `moveTiming.ts`.
3. Recipe RT1 joins cause `lost-the-piece` as a more specific variant (priority over BC1 when it fires).

## G. Proof boards
- Good (RT2): g:1001055178#13 S `Bg5` → "a move earlier, Qxg5"; Danya vc-1GSLXUHTrzc-8 (Bc5), vc-1rcEbI44WqE-42 (Qa4).
- Suspicious: g:1001055178#9 S `Bg2` → "a move earlier Bxg2 would have won your bishop" — a bishop that only now arrives on g2; claim is about the hypothetical board; review the wording (it lights g2). Guard for RT2 copy.
- 33 hits, 6 on mistakes (none of them is the inverse case).

## H. Open questions
- None.
