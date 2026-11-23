# CARD — `pieceTempo` (a move with gain of time)

## A. Identity
`src/services/pieceTempo.ts:46` `pieceTempo(fen, lines, student)` → `PieceTempo {side, from, moves[], target, text, squares}` (`:24`); `newHits :31`. Reads `pieceWork`, `standsSafe`, the engine lines. Census 76/49 (lesson 62, review 14), kind `timing`.

## B. Facts
- **B1** as above; text names the tempo moves ("Bb7 hits their rook on f3, so they have to answer it").
- **B2 dropped:** the hit piece type is in text only; `pieceWork` value (why this piece is idle) dropped; the engine gap of the move.
- **B3 cheap:** it is a BEFORE-THE-MOVE read on the side to move. For a mistake: (a) the student played a non-tempo move while a tempo move existed and cost ≥ mistake — the better move IS a tempo move (`bestSan` ∈ moves) → missed-tempo; (b) after the student's move, THEIR pieceTempo hits a student piece = an allowed kick (overlaps moveLetsIn MS3).
- **B4 gates:** idle piece only (`IDLE_WORK=4`, `:28`); within 100cp of best (`TOO_COSTLY_CP`, `:27`); n/b/r quiet moves; lands safe; target winnable (`legalSeeGainFor ≥1`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | text explains tempo ("so they have to answer it and the move comes back to you") | general lesson + said before the move today |
| CONSEQUENCE | no | — | — |
| BETTER MOVE + JOB | yes | moves + target | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T1 | tempo | S mistake | B3a: bestSan ∈ pieceTempo.moves, played not, cost ≥ mistake | piece, target | "Develop with a threat when you can: a move that hits something makes them answer, and you get the next move too." | | "Bb7 would come out hitting the rook on f3." | "Look for the developing move that also attacks." | same (past) | best must be the tempo move | H |
| T2 | tempo (theirs) | S mistake | B3b: their tempo move after the student's move = errorWhy allowed-threat | | (MS3 / P3 row owns the lesson) | | | | | | — |
| T3 | idle piece | S | positional misplaced-piece + tempo move for that piece | | "Your least active piece is the one to improve — best with a threat." | | | | same | | H |

## E. Mistake link
`positional misplaced-piece`/`no-plan` where the better move was a tempo move (T1, T3); `allowed-threat` kick (via moveLetsIn).

## F. Build changes
1. Learn: delete the before-move line ("Your knight on e2 can move with tempo: Nf4…") — it names the student's next move unasked (census: 62 lesson lines).
2. Expose `targetPiece`, `idleWork` as fields; join to errorWhy when `bestSan` ∈ moves (`better.job = 'tempo'`).

## G. Proof boards
- Census (Learn, before-move — to be deleted): "Your knight on e2 can move with tempo: Nf4 hits their bishop on h5…" (`boards-1.jsonl:2337`, vc-1zfJ7ABoh8k-20, said).
- T1: search David's 109 for bestSan ∈ pieceTempo.moves in the build; the fundamentals run showed best move adds `tempo` over the played move on 10 of 109 (`computeMoveFundamentals` delta) — candidates.

## H. Open questions
1. None beyond the before-move deletion (plan step 5).
