# onlyMove — the one move that holds

## A. Identity
- `src/services/thoughtReads.ts:285` `onlyMove(fenBefore, playedUci, lines)`. Registry `onlyMoveRead` `boardComputers.ts:6539-6552`, kind `key-moment`, weight 66, claim `only:<from><to>`, stakes = gap points. Census 49/43 (lesson).

## B. Facts
- B1: `{ secondSan, gives (words), gapCp }`.
- B2 dropped: `best` (:288) the stake level; the second line's PV (why the next best loses).
- B3 cheap: the inverse — the student did NOT play the only move: `lines[0]` ≠ played and gap(best, 2nd) ≥ onlyMove threshold → "only one move held and it wasn't this"; the refutation of the played move is errorWhy's. Also `readCriticalMoment` count===1 is the same fact (one computer should own it).
- B4: played = engine best (:286); gap ≥ `criticalityThresholds().onlyMove`; |best| < 400 (:289).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "the only move that holds here: the next best, Bxg6, gives up more than a rook's worth" | fires on the found move only (praise) |
| CONSEQUENCE | yes | gives | |
| BETTER MOVE + JOB | n/a | | inverse: names the only move |
| HABIT | no | | "When most moves lose, spend your time on this one." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OM1 | strategize (time) | S | inverse: played ≠ best, best is only move, cost ≥ mistake | best, gives | "Some positions have one move that holds and the rest lose. This was one; the moment to slow down." | errorWhy | "{best} was the only move: {its job}" | "When a move feels forced, check that every reply is covered." / "Slow down when the position is sharp." | after move | |best| < 400; gap proven by the fan | C |
| OM2 | found (praise) | S | today | | Review/lesson only | | | | silent in Learn | | H |
| OM3 | their seat | O | they missed their only move | | "They needed the one move here and didn't find it." | | n/a | | Learn: on their mistake, with the punish held | | C |
| OM4 | record | S | | | RED/GREY OM1 · AMBER "Only one move held." · GREEN silent | | | | | | H |
| — | plan, endgame-specific | — | n/a | | | | | | | | |

## E. Mistake link
- Any errorWhy cause on a board whose fan has count 1 (critical) — OM1 is the HABIT/frame clause for it (methodBeat `slow-down` is the same habit; one claim).

## F. Build changes
1. Merge with `readCriticalMoment` (count === 1) so one computer owns "only one move holds"; onlyMove keeps the material words `gives`.
2. Add the inverse read on the mistake turn (OM1/OM3).
3. HABIT = methodBeat `slow-down` habit id (record-gated) — no second wording.

## G. Proof boards
- OM2: g:1001055178#7 S `exf3` loss 4, next best Rg1 gives up more than a rook (the bishop on f3 must be taken back). g:1012441262#10 O `Kxf7`.
- OM1 data: readCriticalMoment hits with `playedHolds: false` (see readCriticalMoment card): g:1012441262#35 S `Bxf8` count 1 holding `b4`.
- 27 hits, all on the best move (by design).

## H. Open questions
- None.
