# Card — `defenderInTime` (the race to defend a loose-looking pawn)

## A. Identity
- `src/services/defenderInTime.ts:65` — `defenderInTime(fen, lines, student)` → `DefenderInTime[]`; BFS `bfs` over knight and king steps avoiding pawn-covered squares. Endings with no queens; the side to move's knight vs the other king. Registry `boardComputers.ts:~7576` (entry ends `:7584`), kind `technique` (census). Either seat.
- Census: 139 fired / 67 said (held already-said ~50%, same-idea 13).

## B. Facts
- **B1** `DefenderInTime`: `side`, `knight`, `route[]` (knight's squares to hit the pawn), `pawn`, `king` (their king), `walk[]` (king's squares to stand beside it), `text`, `squares`.
- **B2 dropped**: the pawns the best line wins (`won`, excluded silently); `route.length` vs `walk.length` margin (only "in time"); pawns already defended (excluded).
- **B3 cheap**: the MISTAKE trigger — the student's costly knight move is `route[0]` (the student set off after a pawn the king reaches in time); `otherTarget` — a pawn whose walk > route (the race the student WINS) = the better plan; `kingFirst` for the student's own king (the defender's mirror).
- **B4 gates**: not in check, no queens; the pawn not won in the best line and undefended now; a knight route exists (≥1) avoiding pawn-covered squares; the king walk exists and is ≤ route length (the defence in time).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "The pawn looks loose, but your knight needs three moves … their king covers it in two, so it is not a real target yet." — a count (CALC) with its conclusion | the rule lead ("count both trips") |
| CONSEQUENCE | yes | "the defence arrives in time, so the pawn holds" | — |
| BETTER MOVE + JOB | no | — | `otherTarget` / errorWhy better move |
| HABIT | no | — | record (endgame counting) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DT1 | CALC (chased a held pawn) | S attacker | student's costly knight move = `route[0]` toward `pawn`, walk ≤ route | n, m | "A loose pawn is only a target if you get there first: your knight needs {n} moves, their king {m}." / "In the endgame, count both trips before you chase a pawn." | "The king arrives first, and the knight's trip is wasted." | "{best} went for {otherTarget}, where you win the race." (once past) | "Before chasing a pawn, count your moves and theirs." | "In the endgame, count both trips before you chase a pawn — their king got there first." | walk > route (then it's a real target) | C trigger |
| DT2 | PREV (own pawn) | S defender | student's move left a pawn whose king walk > their knight route (the mirror, defence too slow), cost | — | "Your king must reach a loose pawn before their knight does: count it." | "Their knight takes {pawn}." | "{best} started the king toward {pawn}." | DT1 habit | "A loose pawn needs the king there first — yours is a move too slow for {pawn}." | — | C mirror |
| DT3 | KNOW | both | standing (today) | — | Review only: the count (the current text) | | | | silent in Learn | | H |
| — | phase | — | endings only (no queens) | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Their king gets there first." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `misplaced-piece` (the knight's scope gap) or `unexplained` on a slow knight trip → DT1 (DT1 is the cause errorWhy cannot name: today a costed knight trip with no positional tag is silent, E20); errorWhy `allowed-capture` / `left-hanging` (pawn lost) → DT2.

## F. Build changes
1. Return `margin = walk.length − route.length` (typed).
2. Add the trigger `chases(fenBefore, san)` — the student's knight move equals some `route[0]`.
3. Mirror read for the student's own pawn (DT2): `defenderTooLate`.
4. Recipes DT1/DT2 → `mistakeLesson.ts`.

## G. Proof boards
- `lines-0.jsonl#2335` ("Your knight can head for the pawn on b2 in three moves… Their king is there in two"); `lines-0.jsonl#2345` (their knight, your king).

## H. Open questions
- None.
