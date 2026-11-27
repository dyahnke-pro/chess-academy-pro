# CARD — `keptHome` (a piece kept home on purpose)

## A. Identity
`src/services/kingWalk.ts:283` `keptHome(fenBefore, san, who)` → `{key, text, squares}`. Census 4/3 (lesson 2, review 2), kind `held`.

## B. Facts
- **B1** "Your bishop on c1 stays home for now, and it has a job there: if their rook checks on f8, it blocks on f4."
- **B2 dropped:** the check move and block move (in squares only).
- **B3 cheap — the inversion:** a MISTAKE that DEVELOPED the blocker: the student moved the home bishop that was the only block of a check, then the check came (errorWhy king-hunt / allowed-capture with check) → "the bishop had a job at home". Detect: before the move a check of theirs was blockable only by the moved piece from its home square; after the move it is not.
- **B4 gates:** only after a KING move with castling rights gone (`:292`); king on d/e/f (`:294`); king on d/e/f file; their q/r/b check; a home bishop blocks.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | text | on a good move |
| CONSEQUENCE | yes | the check | — |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KH1 | knowledge (a defender's job) | S mistake | B3 inversion | piece, check | "A piece at home can still have a job: with your king in the centre, the bishop on c1 was the block for a check." | "Now …Rf8+ has no block." | | "Before a piece leaves, ask what it would block." | same | the check must be on their line | C |
| KH2 | good move | S | today's case | | Review only | | | | silent | | H |

## E. Mistake link
`king-hunt`, `abandoned-defender` (block variant) — S seat. Pure run on David's costly moves: fired once (chesscom-1015773958 ply 41 Kf2, O) — the excuse case, not a mistake lesson.

## F. Build changes
1. Add the inversion `homeBlockerLeft(fenBefore, san)` as an input to errorWhy's `abandoned-defender` (a guard of a check line is a defender too).
2. KH2 leaves Learn.

## G. Proof boards
- Census: `lines-1.jsonl:4079` (lesson): "Your bishop on c1 stays home for now…"; pure run board `r4rk1/pp3p1p/3p2pB/2p1b3/4P3/2q2KP1/P6P/5B1R w - - 0 21` (Kf2 → "Your bishop on f1 stays home for now…").

## H. Open questions
None.
