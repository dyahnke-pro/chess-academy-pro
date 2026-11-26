# alsoGood — two good moves and the one thing that separates them

## A. Identity
- `src/services/weighedMoves.ts:1298` `alsoGood({fenBefore, san, student, rating, reads})`; difference reader `moveDifference` :1180 (`kind: loose|activity|structure|file`).
- Registry `alsoGood` `boardComputers.ts:3593-3615`, kind `contrast`, claim `also-good:<played>:<other>` (or `also-good:both-win`, once a game), held form on the student's seat. Census 222/103.

## B. Facts
- B1: `AlsoGood { san, uci, gapCp, difference: MoveDifference & {favours, other} | null, text, heldText, squares, key }` (:1268-1281).
- B2 dropped: `playedEs`, `best` expected scores (:1305-1306); `real` of the rival (:1310).
- B3 cheap: n/a for mistakes — it is the opposite fact (the move was good).
- B4: played within 5% expected score of best (`GOOD_MOVE` :115); played ES ≥ 0.30 (`BOTH_LOSE`); rival real ≥ 10% (`ALSO_GOOD_P_FLOOR` :110), within 3% ES (`SAME_WORTH` :113); a board difference, else both ≥ 0.85 (`BOTH_WIN`) "take your pick".

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Nxd5 and cxd5 both hold here, and what separates them is that cxd5 opens the c-file for their rook" | about GOOD moves — never a mistake turn |
| CONSEQUENCE | partly | difference text | |
| BETTER MOVE + JOB | n/a | | |
| HABIT | no | | |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AG1 | strategize (choose by difference) | both | today | difference | "When two moves are worth the same, choose by what each piece does afterwards: {difference}." | | | | Review/lesson only (no mistake) | not on a mistake | H |
| AG2 | both win | both | bothWin | | "When you're winning there is often more than one road; take the simplest." | | | | Review only, once a game | | H |
| AG3 | mistake turn | — | — | | n/a — by gate (`GOOD_MOVE`) the move is within 5% of best, so it is never a mistake turn. The pure run fired on two plies whose OTHER cost read was ≥ 100 (g:1015773958#44 `…Rfe8` 110, g:1036689856#42 `…Qxh2+` mate-scale) — two cost sources disagreeing, not a lesson | | | | silent | | — |
| — | every other angle | — | n/a — a comparison of two good moves teaches choice, not error | | | | | | | | |

## E. Mistake link
- None (Review/chat only). It must NOT run on a mistake turn: AG3 shows it can when the fan read and the after read disagree.

## F. Build changes
1. Mistake turn: `alsoGood` is skipped by the cause gate (the move has a MistakeCause → no "both hold").
2. One cost source per ply (the turn's graded cost) — the registry passes it; `alsoGood` uses the fan's own ES today (:1304-1308), which can call a 110-cp move "holds".

## G. Proof boards
- AG1: Danya vc-_Y-iXy9b4Ew-40 (…Bxe6 / …fxe6, the f-file). AG2: vc-_X7t6o3o6JM-61.
- Guard (must not fire on a mistake turn): g:1015773958#44 S `…Rfe8` (graded loss 110 by the after read) — the run said "…Rfe8 and …Rfb8 both hold here".
- 104 hits on 12 games.

## H. Open questions
- None.
