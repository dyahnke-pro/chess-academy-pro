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
