# Card — `outOfReach` (a square nothing can chase the piece from)

## A. Identity
- `src/services/outOfReach.ts:64` `outOfReach(fenBefore, san, altUcis)`; helpers `pawnCanReach` (:37), `chaseOf` (:47), renderer `outOfReachLine` (:96). Read through `boardReadFacts`/`moveThoughtFacts` (census `outOfReach (boardRead)`, kind `contrast`).
- Census: 65 fired / 64 said.

## B. Facts
- **B1** `OutOfReach` (:30): `piece`, `square`, `contrast {square, chase (a smaller piece now on a square, or the move that brings one), left (the square it left vs the engine's alternative)}`.
- **B2 dropped**: the CHASER on the played square is computed and, if present, the whole read returns null (:75-76) — that null is the mistake fact (the piece went where it can be chased); `worth` comparison (smaller pieces only).
- **B3 cheap**: the inverse `chasedAt(fenAfter, to)` = `pawnCanReach || chaseOf` on the played square (already the gates); `safeAlt` = an `altUcis` square of the same piece passing both gates (the better square).
- **B4 gates**: N/B/R/Q, not a capture, no check, not game over (:70); mover not in check before (:71); no pawn of theirs can ever reach the square (:75); no smaller piece attacks it now or next move (:76); a contrast exists: the square it left was chased (:78) or the engine's other square is (:81-88).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "out of reach: no pawn of theirs can kick it" + the contrast — a good-move reason | rule form; mistake form |
| CONSEQUENCE | partly | "On h3, Rxc3 would have chased it." | for the mistake: the chase move and the tempo |
| BETTER MOVE + JOB | no | — | `safeAlt` once past |
| HABIT | no | — | record `misplaced-piece` / `tempo-handed` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OR1 | KNOW (chased square) | S mistake | student's piece lands where `chasedAt` (a pawn or smaller piece hits it next move) and the move cost | piece, chaser | "Put a piece where nothing smaller can chase it: on {sq} their {chaser} hits it, and you lose the move." / "A piece that has to run again hands them a free move." | "Their {chaser move} gains a tempo." | "{best} put the {piece} on {safe}, out of reach." (once past) | "Before a piece lands, ask: what smaller piece of theirs can hit it there?" | "Your {piece} can be chased there by their {chaser}." | squareChoice says the same kick (same claim key) | C chasedAt |
| OR2 | STRAT (outpost-ish) | S | today's fire (good move) | — | Review only: "On {sq} no pawn of theirs can kick it" | | | | silent in Learn | | H |
| OR3 | seat O | O | their piece on a chaseable square after their costly move | — | "Their {piece} can be chased: hit it with a smaller piece and gain time." | — | — | — | after their move: "Their {piece} on {sq} can be chased by a pawn." (push held) | namesStudentMove | C |
| — | phase | — | the queen rows ("no smaller piece") apply in any phase; endgame king excluded | | | | | | | | |
| — | record | — | RED/GREY · AMBER "Your piece can be chased there." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `tempo-handed` / `misplaced-piece` (`positionalReason.ts:203-208`), `bestJobReason` "The knight belonged on e5" → OR1 explains why.
- Opponent: OR3.

## F. Build changes
1. `outOfReach.ts:64` — add `chasedAt(fenBefore, san)` returning the chaser (from the existing gate calls :75-76) instead of discarding.
2. Hand `safeAlt` (the alt square that passes, :81-88 loop) as a typed field.
3. Merge OR1's claim with squareChoice SQ1 (`kicked`) — one fact (`claims: [`chase:${to}`]`).
4. Recipes OR1/OR3 → `mistakeLesson.ts`.

## G. Proof boards
- OR2 (today): `lines-0.jsonl#311` "Your queen settles on h6… On h3, Rxc3 would have chased it."; `lines-0.jsonl#2456` (knight e3; g4 chased by h3).
- Guard: `lines-0.jsonl#334` held beside-mate.

## H. Open questions
- None.
