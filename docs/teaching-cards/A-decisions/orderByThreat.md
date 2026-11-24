# orderByThreat — why not the other move first

## A. Identity
- `src/services/orderByThreat.ts:45` `orderByThreat(fenBefore, san, line, mine, yPv)`; check branch `checkOrder` :98. Registry `orderFirst` `boardComputers.ts:6279-6298`, kind `move-order`, weight 72, gated by `orderMatters` (engine), claims `order-board:Y>R` + `stops:R`. Census 39/10 (mostly held `already-said` — the stop says the same reply).

## B. Facts
- B1: `{ follow, answer, would, squares }` (:28-36).
- B2 dropped: `w.kind` pin/fork/kick (:81, flattened into the `would` string); the hit pieces (:80) as typed squares exist in `squares` only.
- B3 cheap: the inverse mistake — the student played Y FIRST (the wrong order) and the opponent's reply R was the punishing pin/fork/kick: run `orderByThreat(fenBefore, X=best, line=[reply, Y=played…])`? Simpler: on the student's move Y with cost ≥ mistake, check `theirWantedMoves(after Y)` contains the opponent's actual reply R and R is not wanted after best X → "wrong order".
- B4: Y legal before X; R wanted after Y not after X (:67); R not on Y's square and doesn't hit X's from-square (:68-69); after Y+R, no winning capture for the mover and X still legal (:73-77); check branch needs yPv.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Why not …h6 first? It would allow Bh4, which pins their knight on f6 against their queen" | good-move only; the question form is a description of an alternative |
| CONSEQUENCE | yes | `would` | |
| BETTER MOVE + JOB | partly | X is the move played (good) | inverse needs X named as better |
| HABIT | no | | "Before you play a natural move, ask what reply it allows that another order doesn't." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OT1 | order (inverse) | S | B3: student played Y, their reply R pins/forks/kicks, R not wanted after best X | kind, pieces | "Move order matters: the same moves in the wrong order hand them a {pin/fork/kick}. Playing this first let {R piece} hit your {pieces}." | `would` (past) | "{X} first, then {Y}." | OT habit | after move | R must be the actual or engine reply; cost ≥ mistake | C |
| OT2 | their seat | O | their wrong order | | "They played it in the wrong order: now you have the {pin/fork/kick}." | | the reply is the student's → held | — | Learn: lesson, no move named | | C |
| OT3 | good order | both | today | | Review/lesson only | | | | silent in Learn | | H |
| OT4 | record | S | | | RED/GREY OT1 · AMBER "Wrong order — it allowed the pin." · GREEN silent | | | | | | H |
| — | endgame, calc depth | — | n/a | | | | | | | | |

## E. Mistake link
- errorWhy: OT1 → `allowed-tactic` (E10, motif pin/fork) or `allowed-threat` (E12, kick); OT2 the O-seat; OT3 Review only.
- principle `wrong-move-order`; costReason `allowed` with motif pin/fork (the reply). One cause → OT1 (shared with findEnablingMove EM1, pieceOutFirst PO2: three facts, one cause; pick by which computer fires).

## F. Build changes
1. Type `kind: 'pin'|'fork'|'kick'|'check'` and `hit: {square, piece}[]` (B2).
2. Do not add a second order detector: the fundamental `wrong-move-order` (`principleAttribution.ts`, tested in `principleAttribution.moveOrder.test.ts`) already finds "the student played the engine's second move first". OT1 = that attribution + `theirWantedMoves` (here) on the board after the played move to name the reply kind (pin/fork/kick). One cause, one detector.
3. Register OT1/OT2 under cause `wrong-move-order`.

## G. Proof boards
- g:1001055178#14 O `…Be7` loss 18 → "…h6 first would allow Bh4 pinning f6 to the queen" (OT3, good).
- g:1018307238#9 O `e3` loss 0 → "d4 first would allow …Bb4 pinning c3" (OT3).
- g:1012441262#16 O `…Bg4` loss 113 (the only mistake hit) — fact said about the good alternative; OT1 not yet computed.

## H. Open questions
- None.
