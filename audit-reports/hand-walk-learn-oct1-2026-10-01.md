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
