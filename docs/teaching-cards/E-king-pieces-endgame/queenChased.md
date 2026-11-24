# Card — `queenChased` (the early queen kicked again)

## A. Identity
- `src/services/queenChased.ts:54` — `queenChased(history, san)` (the move that hits the other side's early queen with tempo) + `queenChasedLine(q, queenOwn, fenAfter)` (:88). Uses `pieceMovedAgain.pieceTrips`, `principleAttribution.tempoTargets`, `development.developedMinorCount`. Registry `boardComputers.ts:~6915` (entry ends `:6923`), kind `move-job` (census). Either seat.
- Census: 26 fired / 24 said — one of the few in this family already said as a lesson.

## B. Facts
- **B1** `QueenChased`: `queenSide`, `queen`, `hitter {piece, square, from}`, `queenMoves`, `developed` (minors out), `develops` (the hitter was a pawn or came from its home square), `key`.
- **B2 dropped**: the queen's legal flights after the hit (where it must go) and whether a flight is itself hit again (a trap / a second tempo) — not computed; the move number (`board.moveNumber()`).
- **B3 cheap**: `flights` = queen legal moves on fenAfter that are not attacked by a cheaper piece; `trapped` when flights is empty (→ findTrappedPiece card, family C); `secondKick` — a student developing move that hits the queen's best flight (tempoTargets).
- **B4 gates**: move ≤12 (`OPENING_MOVES`, :29); hitter not a capture, not queen/king, no check; queen off its home square; hitter attacks it with tempo; queen side has <3 minors out (`DEVELOPED_ENOUGH`, :31); queen moved ≥1 time.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Every move your queen spends running is one they spend developing." — the rule, board inside ("Two moves for your queen, now on b7, and only two pieces developed") | — |
| CONSEQUENCE | yes | "it must move again" / "They gain a move" | where it can go |
| BETTER MOVE + JOB | no | — | errorWhy better move for the student's early queen move ("Nf3 developed and kept the queen home") |
| HABIT | no | — | record `neglected-development` (no `queen-out-early` tag exists in `misconceptionTags.ts`) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| QC1 | CONSEQ (student's early queen) | S queen | their move chased the student's queen (`queenSide` = student) right after the student's early queen move that cost | queenMoves, developed, hitter | "An early queen is a target: every move it spends running is one they spend developing — your queen has moved {n} times with {d} pieces out." / "Bring the knights and bishops out before the queen: a queen out early just gets chased." | "Their {hitter} is in the game, and your queen only runs." | "{best} developed a piece instead." (once past) | "In the opening, ask before a queen move: can a minor piece go there first?" | "An early queen hands them tempo — they develop with every kick." | queen move won material (then it isn't a tempo loss) | H |
| QC2 | STRAT (their early queen) | S hitter | student's move did NOT chase their early queen when a developing hit existed (`secondKick`), cost | — | "Hit an early queen with a developing move: you gain the tempo and a piece." | — | "{best} hit the queen and developed." | "When their queen comes out early, look for the developing move that hits it." | "An early queen is a target — a developing move could hit theirs." (only once past, `pastBetterNameable`; else the student's next move → silent) | the kick still playable | C secondKick |
| QC3 | combo (trap) | both | flights empty | — | handed to findTrappedPiece / queenNet (family C) | | | | | | |
| — | phase | — | opening only (≤12) | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Queen out early — it gets chased." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `neglected-development` (`positionalReason.ts:154`) on the early queen move; QC1 is said after THEIR chasing move (the consequence turn) or on the student's queen move with the cost. QC2: errorWhy `missed-win` / positional `neglected-development` on the student's non-developing move (not `tempo-handed`, which means the move FREES their piece, `positionalReason.ts:195`).

## F. Build changes
1. Add `flights`, `secondKick` to `QueenChased`.
2. Recipes QC1/QC2 → `mistakeLesson.ts`; the current lines are the LESSON stems (keep).

## G. Proof boards
- QC1: `lines-0.jsonl#1566` ("Two moves for your queen, now on b7, and only two pieces developed. Their bishop on c6 attacks it").
- Their queen: `lines-0.jsonl#3684`, `lines-1.jsonl#4768` (with the gain sentence).

## H. Open questions
- QC1 is said on the OPPONENT's chasing move when the student's queen move a move earlier was not itself graded a mistake (the cost shows only after the kick). Speak it on their move (the consequence turn), or stay silent because the student's own move was not graded a mistake? (Behaviour — the WO says Learn speaks "after the student's move, only on a mistake by either side"; their kick is a good move, not a mistake.)
