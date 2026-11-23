# Card — `kingRace` (the race to the square that escorts a passed pawn)

## A. Identity
- `src/services/kingRace.ts` — `kingRace(fen, student)`, `kingSteps(c, from, to, col)` (BFS avoiding squares covered by the enemy king/pawns), `passed`. Kind `technique` (census). Either seat.
- Census: 2 fired / 2 said.

## B. Facts
- **B1** `KingRace`: `side` (the passer's side), `pawn`, `escort` (a 7th/2nd-rank square beside the pawn's file nearest the own king), `mine`, `theirs` (king steps), `first` (who arrives first; tie → side to move), `text`, `squares`.
- **B2 dropped**: the other escort square (`sides` sorted, only [0]); the reason a king step is blocked (`fenced`).
- **B3 cheap**: the mistake trigger — the student's costly move was not a king move when `first` flips (fenBefore: student first; fenAfter: them first) — the lost race; `tempoGap = theirs − mine`.
- **B4 gates**: no queens; ≤2 non-pawn pieces a side; a passed pawn on rel. rank 5–6; escort empty; steps differ by ≤1.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Everything hinges on a king race to c7, the square that escorts their b-pawn home: their king needs 4 moves, yours 3" — the count (CALC) | the rule ("in a king race, count first, move second") |
| CONSEQUENCE | yes | "you get there first if nothing gets in the way" | — |
| BETTER MOVE + JOB | no | — | the king step that kept `first` |
| HABIT | no | — | record `passive-king-endgame` / `passed-pawn-neglected` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KR1 | CALC (lost the race) | S | `first` was the student on fenBefore, is them after the student's move | escort, counts | "King races are won by counting: the square that matters is {escort}, and one wasted move hands it over." / "When kings race, every non-king move is a step given away." | "Their king gets to {escort} first." | "{best} went straight for {escort}." (once past) | "In a pawn ending, count the king moves to the key square before every move." | "That lost a step in the king race to {escort}." | `first` unchanged | C trigger |
| KR2 | KNOW (side to move) | both | mine == theirs | — | "Equal counts in a king race go to the side to move." | | | | | | H |
| — | phase | — | endings | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "That lost a step in the race." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `passive-king-endgame` / `passed-pawn-neglected` (`positionalReason.ts:167-172`) → KR1.

## F. Build changes
1. Return both escort squares and `tempoGap`; add `raceFlip(fenBefore, san, student)`.
2. Recipe KR1 → `mistakeLesson.ts`.

## G. Proof boards
- `lines-0.jsonl#7155` ("a king race to c7 … their king needs 4 moves, yours 3").

## H. Open questions
- None.
