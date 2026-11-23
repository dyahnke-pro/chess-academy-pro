# Card — `kingActivityGap` (the more active king in an ending)

## A. Identity
- `src/services/kingActivityGap.ts` `kingActivityGap(fen, lines, student)`; `centre` = king distance to d4/d5/e4/e5; `pawnDist` = nearest enemy pawn. Registry `boardComputers.ts:7446` (kind `technique`), weaknesses `moveInsight.ts` (files the student's passive king).
- Census: 8 fired / 4 said.

## B. Facts
- **B1** `KingActivityGap`: `active`, `activeKing`, `passiveKing`, `activeCentre`, `passiveCentre`, `text`, `squares`.
- **B2 dropped**: `pawnDist` for each side (a gate only); the engine score (`lineScore ≥ −?`).
- **B3 cheap**: the mistake trigger — the student's king move increased `centre(king)` or the student's non-king move while `passiveCentre − activeCentre ≥2` for the student (cost); `kingRoute` toward the centre (BFS, reuse `kingRace.kingSteps`).
- **B4 gates**: no queens; each side ≤2 non-pawn non-king pieces; gap ≥2 in centre distance and ≥2 in pawn distance; engine not against the active side.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "In an ending your king has to come forward and fight." / "keep using your king" — the rule with the example | — |
| CONSEQUENCE | partly | the distances | what the active king takes (pawns in reach) |
| BETTER MOVE + JOB | no | — | errorWhy better move (the king step) |
| HABIT | no | — | record `passive-king-endgame` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KG1 | KNOW (the flip) | S passive | student's costly move left the student's king passive (gap ≥2) | kings, steps | "In the endgame the rule flips: bring the king to the centre — your king on {p} is {n} steps away while theirs on {a} is fighting." / "With the queens off, the king is a strong piece: use it." | "Their king reaches your pawns first." | "{best} brought the king toward {sq}." (once past) | "In the endgame, every quiet move: can my king come closer?" | "Your king is far from the fight — theirs is in it." | queens on | H |
| KG2 | STRAT (yours active, kept it) | S active | (good) | — | Review only | | | | silent | | H |
| KG3 | combo + kingRace | both | race exists | — | handed to kingRace | | | | | | |
| — | record | — | RED/GREY full · AMBER "Bring your king in." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `passive-king-endgame` (`positionalReason.ts:167-170`, "the king belongs nearer the centre") and `bestJobReason` "The king belonged on X" (:222) → KG1.

## F. Build changes
1. Return `pawnDist` both sides; trigger `madeWorse(fenBefore, san)`.
2. Recipe KG1 → `mistakeLesson.ts` (cause `positional:passive-king-endgame`). The current text is the LESSON stem.

## G. Proof boards
- `lines-0.jsonl#7120` ("Their king on f4 is the more active king: one step from the centre, while yours on f8 is three steps").

## H. Open questions
- None.
