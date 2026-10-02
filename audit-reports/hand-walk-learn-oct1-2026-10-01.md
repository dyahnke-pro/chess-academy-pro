# Hand walk — Learn, 3 fresh games (2026-10-01)

Games: rgLTiUZAWQY (Scandinavian, student White), 0ipLPOAN_m8 (English → KID,
student Black), 5M0c_EwRQiI (Sicilian Nimzowitsch, student White). Muted hand
driver on localhost, 4 board questions per game. Every sentence checked: the
machine checker (`tape-verify`, engine reads at depth 16) plus by hand against
the board and the stored lines for the rest.

| game | sentences w/ claims | checker TRUE/FALSE | hand-checked false |
|---|---|---|---|
| 1 | 46 | 20 / 0 | 0 |
| 2 | 98 | 40 / 0 | 2 (only-move with three mates; "blunder — gives away material" inside a mate) |
| 3 | 132* | 53 / 0 | 2 (passer "created" that is recaptured; recapture called the trap) |

\* game 3 stopped at ply 51 — the driver's board refused h4 (harness timing; re-walk watches for it).

Accuracy over every sentence with a board claim: **272 / 276 = 98.6%** before fixes.

## Flags (walked first, fixed after)

| # | ply | flag | fix |
|---|---|---|---|
| A1 | g1 13, g2 50 | "kicks their knight off c6" drew a c7→c6 arrow; "off f4" drew f2→f4 | `off/onto/into/past` are square nouns (`arrowEngine`) |
| A2 | g1 27/41/53, g2 42 | a move the line STOPS or says "didn't work" drawn as a green play arrow (Ra5, Rxf7, Bf4; …b3 on the wrong side) | `ruledOutSans` — ruled-out moves are said, never arrowed |
| F1 | g1 29 | "getting the rook to c3, by way of c1" — own knight on c3 | route onto its own piece is no plan (`routeDestination`) |
| W2 | g1 33 | "getting the knight to a7" — a7 is their pawn | said as "getting the knight to a7, by way of b5, to take the pawn there" |
| W4 | g1 69, g2 28 | "…Kb7 doesn't work." — no reason | `stopReason` names the covering piece for an illegal king step |
| R1 | g1 41 | "the only move" twice (grade + found-move lane) | grade stands down when the found-move lane speaks |
| Q1 | g1 Q48 | ending: "Rg5 takes aim at the center" | centre reason gated out of endings at the computer |
| O1 | g2 12 | "transposed into the KID", then "The line was the English" at the departure | departure names the opening already announced |
| W7 | g2 14 | …h6 against Bg5 called luft | the kick is the point (`pawnKickPoint`) |
| F2 | g2 78 | "Bxe4: the only move that holds" — three moves mate | no only-move/clear-best when the runner-up still wins |
| F4 | g2 76 | "Their Kg3 is a blunder — gives away real material" in a mate | no verdict on a move of a side already ≥5 down / being mated |
| F5 | g3 33 | "exf3 was their move, to create a passed pawn on f3" — Qxf3 | a passer must survive the plan's horizon |
| W9 | g3 35 | "it hands the opponent a passed pawn", said to the student | seat-aware: "hands you" / "hands them" |
| F6 | g3 49 | "which is the trap: … Nxf8 arrives" — a plain rook trade | a recapture is never the calculation blow |
| W10 | g3 27 | "Lift the rook to e3 and swing it … into the attack" — g3 blocks, no attack | the lifted rook must reach a file into the king's zone |
| R2 | g2 62/64 | "a piece up — trade pieces" then "up material — trade down" | character switch shares the `convert:trade-pieces` claim |

Not flagged after checking: "fighting for the center on d4, c5 and f4" (extended
centre, by definition); the bare "Check." (kept by design); "kept the win" with
the runner-up at +2.4 (the app's win band starts at +3).

Tests: `src/services/walkOct1Learn.test.ts` (10, all fail on the old code where
the fix lives in the stashed file) + `openingAnnouncement.test.ts` departure case.

Found by the related-test sweep while fixing: the endgame fixture table still
listed the pre-rebuild lesson boards (updated), and "queen versus rook" fired
on queen against TWO rooks (the perpetual lesson) — now one rook only.

## Re-walk (same 3 games, after the fixes)

Checker: 125 / 126 checked claims TRUE; the one it marks false (Kf1 "takes the
king off the line") is within 0.1 of the best at depth 18 — its stored lines
are only the top three. All 16 flags above gone from the tape. New, fixed:

| # | flag | fix |
|---|---|---|
| R-1 | "e5 was their move, to swing pieces toward their king" (mover's voice) | coach/opponent verdicts flip to the student's seat |
| R-2 | "getting the rook to d1, by way of d5" — a retreat | no heavy-piece route back to its own first rank |
| R-3 | "hitting d4 and e5" drew e7→e5 | squares in a list are squares |
| R-4 | "mate in 18" where the shortest was 5 | the count only up to five |
| R-5 | "wins two pawns" for a knight won for a pawn / the exchange | said by the pieces that change hands |
| R-6 | conversion said twice (62/64) — the claim fix missed the conversion lane | the conversion fact carries its step's claim |

## Review walk (same 3 games) — game 1

Contaminated run (page wedged at ply 94/95; the driver could not answer the
turning-point card) — ACC and SEAT green over 52 narrated plies. Read by hand:
one defect, twice — "pushing the passed pawn on the a-file" (ply 57, …a6 still
blocks a4) and "on the c-file" (ply 67, …c5 blocks c4). Review's hindsight arc
skipped the walkability gate Learn applies; now both read it (`gameArcs`).

## Review walk (same 3 games, clean re-run after the fixes)

Game 2 (0ipLPOAN_m8) MEETS STANDARD on the audit; games 1 and 3 failed only on
NEED (owed opening plies silent) — game 1 also SHOW at ply 13, game 3 wedged at
ply 15 (harness, rerun). Every ply read by hand (game 2 in full) plus an offline
dump of all three games through the production review with the real engine.

| # | ply | flag | fix |
|---|---|---|---|
| V1 | g2 54 | "You could have won their knight on d3 with Bxd3 … You played Rxa4" — Rxa4 took back a QUEEN | a played capture worth as much as the missed win is never a miss (`findMissedChain`) |
| V2 | g2 64 | "Your rook swings onto the open a-file" — R8a3 was already on it | the rook concept needs a change of file |
| V3 | g1 18 | "e5 — the idea is to swing pieces toward their king" (the opponent's idea, said in their voice) | the opponent's better-move reason is seated to the student (`toStudentSeat`, every possessive) |
| V4 | g2 44 | "…c4 stakes out the center and grabs space" in a queenside chain | a flank pawn touching no core square makes no central claim |
| V5 | g2 49/50 | passer plan, then "wants to run", then "the plan for you here: pushing the passed pawn" | one claim per passer file per game; the full plan outranks the note and the arc |
| V6 | g2 59/62/68 | "convert your extra material" → "trade pieces, not pawns" → "when you're ahead the plan is to trade" | one conversion claim per game; the concept fill gives the nod only |
| V7 | all | NEED: owed opening plies silent (7, 9, 15, 17 …) | measured: 7 of 9 are say-once silences (development / centre / fianchetto already taught) — now marked `sayOnce` in the coverage row and counted separately; the real gaps are Be2 (declining the bishop trade) and Ne4 (eyeing d6) — no computer yet |

Tests: `src/services/reviewWalkOct1.test.ts` (4, all fail on the old code).

Re-walk after the fixes (games 1 and 3): **NEED passes on both** — game 1 10/12
(8 narrated, 2 say-once), game 3 11/12 (8 narrated, 3 say-once). Both runs were
still marked CONTAMINATED: game 1 wedged at the final turning-point card (the
driver could not answer it), game 3 at ply 15 (all three runs). Ply 15 is not a
product freeze — a probe stepping the same game by hand, and one repeating the
audit's exact explore (Nd6+ at ply 10) → Back → Play sequence, both ran past ply
22 with every readout under 220 ms. The wedge is the audit's, recorded as such.

## Tactics walk — My Mistakes + Setup Trainer (2026-10-01)

Three real amateur games (825 / 1133 / 1525) seeded through the page and run
through the production `generateMistakePuzzlesFromGame`; four puzzles produced
and solved by hand, wrong tries first; every claim checked with Stockfish.

| # | where | flag | fix |
|---|---|---|---|
| T1 | My Mistakes, 3 of 4 puzzles | a stored line ending on the OPPONENT's reply never completed — "3/3", no celebration, no why, no Next button, no capability evidence | the board completes after that final reply too (`finishSolved`) |
| T2 | My Mistakes, steps 2-3 | "It forks the king … while your move let them play Bxe8, winning the rook" — Bxe8 is not legal there; the clause judged the GAME move on every later board | solution steps are never judged by the game move; the board recomputes step lines, so stored rows are fixed too |
| T3 | My Mistakes prompt + voice | "a inaccuracy" | article by the word |
| T4 | Setup Trainer, puzzle 1 | "find the quiet move that sets up the fork" — the answer, Nd6, IS the fork (queen b7 + rook c8) | a first move that is itself a fork is not a setup puzzle (`moveIsTheFork`, shared fork verifier); 20 of 502 beginner puzzles drop |

Checked and fine: the wrong-try hints (board-true), the mate puzzle (Rd7+ Rd8+
R1d7# completes with the why and Next), cxb6 "wins the pawn on b6".
Tests: `reviewWalkOct1.test.ts` (Tactics + Setup cases),
`MistakePuzzleBoard.endsOnReply.test.tsx` — all fail on the old code.

## Learn walk, 3 more fresh games (am-174083521118 Van Geet/Black, am-173903420240 Scandinavian/White, am-173849611894 QGD/Black)

Checker (depth 16): 58 of 140 claims machine-checked, 55 TRUE / 3 FALSE — all three
are checker errors (lines legal on their own board; Nf5 is the engine's best at
depth 20). Hand-read the other 82. **Accuracy: 138 / 140 board claims = 98.6%.**
Game 3 stopped at ply 48 (driver's board refused f6 — harness).

| # | ply | flag | fix |
|---|---|---|---|
| L1 | g1 10 | missed fork f6 called "Convert with patience: you were clearly winning" — a pawn DOWN on the board | `botched-conversion` needs a material lead to convert |
| L2 | g1 68 | "Rxe2+ was a mistake — it let them take your rook on e2" — rook for rook | a take-back on the traded square is a trade, not a loss (`punishmentOf`) |
| L3 | g1 44 | "The rook on the c-file to d8 can wait" | spoken disambiguation is "the c-file rook" (`sayMoveNoun`) |
| L4 | g2 45 | "The point of their …Rxc7: it stops your Qxd8 fork" — taking back the queen | a take-back's point is the take-back (`threatStoppedBy`) |
| L5 | g2 35 | "c5 is a hole…" drew a c6→c5 pawn arrow | a square that is a sentence's subject is a square (`arrowEngine`) |
| L6 | g2 39/41 | moves inside lines that "didn't work" arrowed green/red | the whole refuted line is ruled out (`ruledOutSans`) |
| L7 | g3 30 | "Rc8? Then Bc2, c5…" — refuted candidate and its refutation arrowed | the questioned candidate and its line are ruled out |
| L8 | g2 Q26, g3 Q29 | "none are analyzed yet — so I can't read the mistakes you make" while the record held a repeated slip | the live record answers first (`reminderWithRecord`) |
| open | g1 66 | …Rf6 (−0.2 → −2.9) got no grade, only a back-rank warning | replay pending — find which door rule held it |
| open | g2 53 | b2→b4 arrow with no words | replay pending |

Tests: each fix carries one that fails on the old code (`principleAttributionEvalPv`,
`inaccuracyCall`, `spokenMove`, `opponentMovePurpose`, `arrowEngine`,
`walkOct1Learn` ×2, `coachApi.reminderWithRecord`).
