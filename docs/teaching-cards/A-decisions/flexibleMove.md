# flexibleMove — keep your options open

## A. Identity
- `src/services/flexibleMove.ts:298` `flexibleMove(fenBefore, san, reads)`; line `flexibleMoveLine` :395. Registry `flexibleMove` `boardComputers.ts:4245-4270`, kind `move-order`, phase NOT_ENDING, both seats. Census 87/85 (lesson).

## B. Facts
- B1: `{ verdict: 'kept'|'committed', played, rival, differ: FlexOption[] (square/break/castle), choice: Square[], inaccuracy, key }`.
- B2 dropped: the cp gap to best (`best - mine.cp`, :312) — known, not returned; `options` total.
- B3 cheap: nothing new needed; for a mistake turn, the gap is already the cost.
- B4: ≥ 2 reads; not in check; move ≤ `FLEX_UNTIL_MOVE`; played within 100 of best (`FLEX_INACCURACY_CP` :58); an inaccuracy with a material-losing line is skipped (:315); played quiet; a quiet near-best (30 cp, `FLEX_NEAR_CP` :52); `FLEX_UNTIL_MOVE` = 12 (:61) rival of another piece; strict subset of removed options.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "That move takes squares from your dark-squared bishop. f4 is no longer open to the bishop. c4 was just as good…" | board restatement-led; general rule ("the piece with more choices waits") not said |
| CONSEQUENCE | partly | lost squares | |
| BETTER MOVE + JOB | yes | rival "was the better move" (inaccuracy) | |
| HABIT | no | | "Develop the piece whose best square you already know; keep the others flexible." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FX1 | strategize (option principle) | S | verdict committed, inaccuracy true | piece, lost squares | "In the opening, play the move that keeps the most choices. This one settled your {piece} before you knew where it belongs: it can't go to {squares} now." | "Those squares are gone for it." | "{rival} kept them." | FX habit | Learn only if inaccuracy is a Learn turn (≤ 100 cp — never a "mistake") | committed + inaccuracy | H |
| FX2 | knowledge (knights before bishops) | S | FX1 with differ = a bishop's squares, played = early bishop | | "Knights before bishops: the bishop has more good squares, so it waits until you know which one." | | rival | | | | H |
| FX3 | good (kept) | both | verdict kept | | Review/lesson praise | | | | silent in Learn | | H |
| FX4 | their seat | O | their committed inaccuracy | | "A piece committed early has told you where it lives. Their {piece} can no longer reach {squares}." | | n/a | | silent unless a mistake | | H |
| FX5 | record | S | | | RED/GREY FX1 · AMBER one clause · GREEN silent | | | | | | H |
| — | endgame | — | n/a (NOT_ENDING) | | | | | | | | |

## E. Mistake link
- Review/chat only unless §H answers "an inaccuracy is a Learn turn": no errorWhy cause exists below 100 cp (`inaccuracyCall.ts:1263`).
- At most an inaccuracy (≤ 100 cp by construction): no errorWhy cause (inaccuracy has no costReason). In a mistakes-only Learn this computer never speaks unless the inaccuracy question is answered "yes". Principle `knights-before-bishops` shares FX2.

## F. Build changes
1. Return `gapCp` (B2).
2. If inaccuracies stay out of Learn: mark the registry's Learn surface `not` with reason "inaccuracy-only". Otherwise add FX1/FX2 to `mistakeLesson` under cause `committed-early`.

## G. Proof boards
- No mistake-turn hits (21 hits, all loss < 100). g:1001055178#3 S `Nf3` (kept vs e3), g:1012441262#5 S `Nf3` (kept vs Be2) → FX3. Danya vc-_X7t6o3o6JM-14, vc-_zT8aWZh2x0-9.

## H. Open questions
- Is an inaccuracy (50–100 cp) a Learn turn? (Decides whether this card speaks in Learn at all.)
