# Card — `rookOnSeventh` (a rook on the seventh)

## A. Identity
- `src/services/reviewTeachingPoints.ts:214` `rookOnSeventh(fen, studentColorWB)` → string | null. Registry `boardComputers.ts:4493` `rook7` (kind `rook7`), `squares: []`, `seat: 'student'` — the STUDENT's rook only.
- Census: 72 fired / 30 said. Held: already-said 18, **unsupported 13** (no squares), beside-mate 5, in-flux 3, same-idea 3.

## B. Facts
- **B1**: a sentence only ("your rook has reached the seventh on e7, where it eats their pawn on b7 and shuts their king in").
- **B2 dropped**: `rook.square`, `pawns[]` (their pawns on that rank, :222), `pinned` (their king on its back rank, :224) — all only in prose; the registry hands `squares: []` (→ `unsupported`).
- **B3 cheap**: `safePawns` — which of `pawns` the rook can take now without loss (`legalSeeGainFor`); the OPPONENT's rook on the student's second rank (same read, other colour — the seat is missing); `cutKing` the defender king's rank boxed (rank 8 with no luft → seventhRankMate / backRank cards).
- **B4 gates**: a student rook on the 7th/2nd (:218); fires if pawns there OR their king on its back rank (:225-226). No phase, no "reached on this move" (a standing read every ply → already-said 18).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "where it eats their pawn on b7 and shuts their king in" — the rule's consequences, specific | rule lead; the mistake seat |
| CONSEQUENCE | partly | the eat / shut-in | which pawn is free (`safePawns`) |
| BETTER MOVE + JOB | no | — | the move that got the rook there (once past) / the defence |
| HABIT | no | — | record `passive-rook` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R71 | PREV | S defender | THEIR rook reached the student's 2nd rank on their move, and the student's prior move allowed it (cost) | rook, pawns | "A rook on your second rank eats pawns and shuts your king in: don't let it in." / "Guard the entry square of your second rank before their rook arrives." | "Their rook on {sq} takes {pawn} next." | "{best} covered {entry}." (once past) | "Before you leave a file, check which rank their rook can reach." | "Their rook is on your second rank now." | — | C (colour mirror) |
| R72 | STRAT (missed) | S attacker | costReason missed / positional `passive-rook` where best puts the rook on the 7th | — | "Rooks belong on the seventh: there they eat pawns and keep the king on its back rank." | "On {sq} it hits {pawns}." | "{best} put the rook on the seventh." | "Every rook move, ask: can it reach their second rank?" | "Your rook could reach the seventh." (square held) | — | H positionalReason (`positionalReason.ts:188-196` names the open file, not the rank) |
| R73 | CALC | S attacker | rook on 7th, student's move didn't take a free pawn (safePawns) with cost | — | "A rook on the seventh earns its place by taking pawns: the pawn on {sq} was free." | — | "{best} took {sq}." | — | "There was a free pawn on the seventh." | not safe | C safePawns |
| R74 | combo + seventhRankMate | — | two heavies | — | handled by `seventhRankMate` | | | | | | |
| — | phase | — | any; strongest in rook endings | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Their rook is on your second rank." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student defender: `costReason` allowed with the rook landing on rank 2 → R71.
- Student attacker: `positionalReason` `passive-rook` (rook gain, `positionalReason.ts:186-196`) / costReason missed → R72/R73.

## F. Build changes
1. `reviewTeachingPoints.ts:214` — return `{ rook, pawns, pinned, seat }` (object), a REQUIRED `who: 'student' | 'opponent'` read for both colours.
2. `boardComputers.ts:4497` — `squares: [rook, ...pawns]` (fixes 13 `unsupported`); fire on the move that ARRIVES (fenBefore no rook there) to stop 18 already-said.
3. Add `safePawns` (legalSeeGainFor).
4. Recipes R71–R73 → `mistakeLesson.ts`.

## G. Proof boards
- `lines-0.jsonl#3945` ("Your rook has reached the seventh on e7, where it eats their pawn on b7 and shuts their king in", held in-flux).
- R71: owed — a census row exists only for the student's rook (seat missing).

## H. Open questions
- None.
