# contrastMoves — what your move leaves behind that another kept

## A. Identity
- `src/services/moveContrast.ts:66` `contrastMoves(fenBefore, sanA, sanB)`; `contrastClause(c, fen, student, played)` :94. Registry `contrast` `boardComputers.ts:6600-6624`, kind `contrast`, claim `contrast:<square>`, seat `student`, the played move vs the engine best. Also `weighedMoves.moveDifference`. Census 346/263 (review 92, lesson 90+81).

## B. Facts
- B1: `{ keeps, drops, piece, square }` (:52-59).
- B2 dropped: whether the loose piece can actually be WON (reachable next move is checked for pieces only, :46; a pawn counts always); the cost of the played move.
- B3 cheap: SEE on the loose square after the played move (`legalSeeGainFor`) → "and they can take it"; the engine reply (after-read) capturing it → the consequence.
- B4: exactly one of the two moves leaves a piece loose (that stands on both boards, :86-89); loose piece = no defender, a non-pawn only if an enemy can hit it next move (:46). Registry: played ≠ best; the piece exists on the real board after (:6609).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Your move leaves your g-pawn with no guard, where b3 would have kept it defended." | a board statement; the lesson ("every move changes what is guarded") unsaid |
| CONSEQUENCE | no | — | B3 (can they take it?) |
| BETTER MOVE + JOB | yes | `keeps` + "kept it defended" | |
| HABIT | no | | "Before a piece moves, ask what it is guarding." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CT1 | identify (guard left) | S | mistake turn, `drops` = played, B3 SEE > 0 | piece, sq | "Every move changes what is guarded. This one left your {piece} on {sq} with no guard, and they can take it." | "They win the {piece}." | "{keeps} kept it defended." | "Before a piece moves, ask what it is guarding." | after move | B3 SEE > 0 — a loose pawn nobody can take is no lesson | C |
| CT2 | positional (loose pawn) | S | drops = played, piece pawn, SEE = 0 | | "A pawn with no guard is a target for later: {keeps} kept your {pawn} defended." | | keeps | | only if inaccuracies speak / Review | | H |
| CT3 | praise-inverse guard | S | keeps = played on a MISTAKE turn | | NEVER — measured: on 60 mistake turns contrast fired, 27 times the mistake was the move that "keeps" a piece defended, i.e. it praised the mistake (e.g. g:1001055178#46 `…f5` loss 174 "keeps the queen on e7") | | | | silent | the mistake's cause is elsewhere | — |
| CT4 | their seat | O | their move dropped a guard | | "Their move left their {piece} on {sq} unguarded." | | the capture is the student's → held | | Learn: pointer rule | | C |
| CT5 | record | S | | | RED/GREY CT1 · AMBER "It left your {piece} unguarded." · GREEN silent | | | | | | H |
| — | plan, endgame, calc | — | n/a | | | | | | | | |

## E. Mistake link
- whyItFailed `abandoned-defender`; positionalReason `defender-left`. One cause → CT1 (shared with blunderCheck BC2, computeBoardDelta "walks away from"). Student seat; opponent via CT4.

## F. Build changes
1. Registry `boardComputers.ts:6600`: on a mistake turn read only the `drops === played` direction (CT3 guard).
2. Add `capturable: boolean` (SEE) and `cheapestAttacker` to `MoveContrast` (B3).
3. Subsume with computeBoardDelta "walks away from" and blunderCheck BC2 (one claim `guard-left:<sq>`).
4. Add a mover param for CT4.

## G. Proof boards
- CT1: g:1001055178#41 S `Kh1` loss 113 → keeps `Qh5`, drops `Kh1`, pawn c5 (check SEE at build — c5 was "attacked once and nothing guards it" per evalReading on the same board).
- CT3 guard: g:1001055178#46 O `…f5` loss 174 (keeps = played); g:1001055178#56 O `…g5` loss 113 drops = played, pawn h6 → CT4.
- Danya vc-_zT8aWZh2x0-12 ("Your move leaves your b-pawn with no guard, where e5 would have kept it").

## H. Open questions
- None.
