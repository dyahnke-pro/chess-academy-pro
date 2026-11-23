# CARD — `pieceCage` (the move takes the squares their knight needs)

## A. Identity
`src/services/pieceCage.ts:63` `pieceCage(fenBefore, san, mine)` → `PieceCage {knight, taken, left, clause, squares}` (`:22`); `safeSquares :37`, `knightReach`. Census 14/10 (lesson only), kinds `aspect-their-weakness`, `two-jobs`.

## B. Facts
- **B1** as typed; clause rotated.
- **B2 dropped:** `was` (the knight's safe squares before), so "how much it lost" is only implicit.
- **B3 cheap:** (a) the REVERSE seat — THEIR move cages the STUDENT's knight (`pieceCage(fenAfterStudent, theirReply, false)`): the student's previous move put the knight where it can be caged (rim / advanced square) = a placement mistake when the cost follows; (b) knights only today — the same `safeSquares` reader works for bishops (bad bishop / trapped bishop) — trapped_piece motif link.
- **B4 gates:** no capture/check (`:72`); knight not at home/first square (`:83`); not already lost (`:85`); ≤1 safe square left, the move itself covers every taken square (`:89-92`); had ≥2 before (`:94`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | — |
| CONSEQUENCE | yes | left ("only d7 left") | — |
| BETTER MOVE + JOB | partly | on bestSan | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PC1 | knowledge (knight placement) | S mistake | B3a: their reply cages the student's knight AND errorWhy cause trapped_piece / misplaced-piece on that knight | knight, left | "A knight needs squares: put it where pawns can't take them away." / "A knight on the rim has half its squares; one pawn move can take the rest." | "The knight on e2 has only f4 left." | better square for the knight | "Before a knight goes forward, count its way back." | same | the cage must be the cause | C |
| PC2 | prevent (theirs, trapped) | S mistake | cage then capture (trapped_piece allowed) | | "A piece with no retreat is lost the moment it's attacked." (errorWhy E10 trapped_piece) | | | | same | | H |
| PC3 | own plan (restriction) | S mistake | best = cage move, positional no-plan | | "Taking squares from their knight is a plan: a knight with one square does no work." | | "c5 took d4 from the knight." | | same | | H |
| PC4 | bishop extension | S/O | B3b | | "A bishop blocked by its own pawns can be trapped like a knight." | | | | | | C |

## E. Mistake link
errorWhy `allowed-tactic` motif `trapped_piece` (PC1/PC2), positional `misplaced-piece` (PC1), `no-plan` (PC3).

## F. Build changes
1. Expose `was` (squares before).
2. Reverse-seat call after the student's move (input to the cause: `cause.caged`).
3. Optional generalisation of `safeSquares` to bishops (PC4).
4. Learn: the good-move cage line ("You play Nf6: it takes d5 from their knight on e3") leaves Learn.

## G. Proof boards
- Census, their cage of the student's knight (PC1 shape): "They play c5 — it takes d4 from your knight on e2, which has only f4 left." (`boards-3.jsonl:2409`, vc-1zfJ7ABoh8k-22); "They play Bf3 — it takes e4 from your knight on c5, which has only d7 left." (`boards-2.jsonl:453`).
- Pure run on David's costly moves: no cage by the played move (0 of 109); PC1 needs the reverse call (build test).

## H. Open questions
None.
