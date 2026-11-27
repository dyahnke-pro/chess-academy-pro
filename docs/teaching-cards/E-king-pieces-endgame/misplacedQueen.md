# Card — `misplacedQueen` (the queen doing little where she stands)

## A. Identity
- `src/services/misplacedQueen.ts:40` `misplacedQueen(fen, lines, student)`; `queenTargets` (:19), `pieceWork`. Registry `boardComputers.ts:~7389` (entry ends `:7395`) (kind `quality`). Standing board; both seats.
- Census: 2 / 2.

## B. Facts
- **B1** `MisplacedQueen` (:17): `side`, `from`, `to`, `workNow`, `workThere`, `hits[]`, `text` ("Their queen on c8 is misplaced: it does very little there. From c7 it would hit the squares around your king."), `squares`.
- **B2 dropped**: which engine line (within 30cp) and the queen move's ply (:49-51).
- **B3 cheap**: the mistake trigger — the student's queen move went to a square with `pieceWork ≤5` when a line had a square with ≥2× work (fenBefore vs fenAfter).
- **B4 gates**: line within 30cp of best (:47); that side's first queen move in its first 3 moves, quiet (:52-53); not from d1/d8 (:55); the queen not attacked (:57); workNow ≤5, workThere ≥2× and +4 (:61); hits something (:63).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "misplaced: it does very little there. From c7 it would hit …" (specific) | rule lead |
| CONSEQUENCE | yes | the hits | — |
| BETTER MOVE + JOB | partly | `to` + hits (names the student's queen move → held in Learn) | — |
| HABIT | no | — | record `misplaced-piece` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MQ1 | PLAN | S | student's queen misplaced, student's costly move was elsewhere and best = the queen move | from, to, hits | "Your strongest piece should be doing the most: the queen on {from} hits almost nothing." | "On {to} it would hit {hits}." (once past) | "{best} put the queen where it hits {hits}." | "Ask every few moves: is my queen doing as much as it can?" | "Your strongest piece should do the most — the queen on {from} hits almost nothing." (the better queen square held while playable) | better queen move still playable keeps {to} unsaid | H |
| MQ2 | CONSEQ | S | student's own queen move to a passive square (cost) | — | "A queen move should hit something: on {to} it attacks nothing their side cares about." | — | as MQ1 | MQ1 | "A queen move should hit something — this one landed where it attacks nothing they care about." | queen was attacked (flight) | C trigger |
| MQ3 | seat O | O | their queen misplaced | — | "Their queen on {from} is out of play: attack where it can't help." | | | | Review only unless their misplacement is graded a mistake | | H |
| — | record | — | RED/GREY full · AMBER "Your queen does little there." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `misplaced-piece` (activity gap, `positionalReason.ts:192`; `bestJobReason` "The queen belonged on c7", :223) on a queen → MQ1/MQ2.

## F. Build changes
1. `misplacedQueen.ts:17` — add `line` index and `ply`; add `misplacedQueenMove(fenBefore, san, lines)` for MQ2.
2. Recipes → `mistakeLesson.ts`.

## G. Proof boards
- `lines-1.jsonl#630` (their queen on c8, from c7 it would hit the squares around your king).

## H. Open questions
- None.
