# Card — `theirWorstPiece` (leave their bad piece bad)

## A. Identity
- `src/services/theirWorstPiece.ts:18` `theirWorstPiece(fen, student, bestLine)` (same finder `findWorstPlacedPiece`, other seat). Registry `boardComputers.ts:~7408` (entry ends `:7414`, kind `quality`). From move 10.
- Census: 77 fired / 27 said (held already-said 50).

## B. Facts
- **B1** `TheirWorstPiece` (:16): `square`, `piece`, `kind`, `text` ("Their worst piece is the bishop on e7: it has one square to go to. Leave it there: don't offer to trade it off."), `squares`.
- **B2 dropped**: the engine check that the piece stays out for four moves (:31) is a gate only.
- **B3 cheap**: the MISTAKE trigger — the student's move offers a trade of / captures that piece (chess.js: move.captured on `square`, or the student's piece lands attacking it and is defended) on fenBefore where `theirWorstPiece` held; `whatItBlocks` — their own pawns around it (bad-bishop pawns on its colour).
- **B4 gates**: move ≥10 (:19); a worst piece, not rook-file (:23); not a minor at home (:26); not a bad bishop (`badEnemyBishop` owns it, :29); best line ≥4 plies and its first 8 plies never move or take the piece (:31-32).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Their worst piece is the bishop on e7… Leave it there: don't offer to trade it off." | it's said on a standing board, not on the trade that broke it |
| CONSEQUENCE | no | — | "Now their good piece is the one left." |
| BETTER MOVE + JOB | no | — | errorWhy better move |
| HABIT | no | — | record `bad-trade` (TW1) / `tempo-handed` (TW2) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TW1 | STRAT (traded their bad piece) | S | theirWorstPiece on fenBefore; the student's costly move captured or offered it | piece, square, reason | "Don't trade their worst piece: their {piece} on {sq} {reason}, and taking it off frees them of their worst problem." / "Trade their good pieces, keep their bad ones." | "Their remaining {good piece} does the work now." | "{best} kept the trade off." (once past) | "Before a trade, ask whose piece is worse." | "Trading off their worst piece frees them of their worst problem — that was it." | the trade wins material (then it's material, not this) | C trigger |
| TW2 | STRAT (keep it bad) | S | student's move opened a line/square for that piece (it frees: scope up) | — | "Keep their bad piece bad: don't open the lines it needs." | "Their {piece} on {sq} gets {n} more squares." (`positionalReason` :195 note) | errorWhy better move | TW1 | "That opened a line for their worst piece." | — | C scope / H positionalReason |
| TW3 | seat O (they trade your bad piece) | O | mirror | — | Review only | | | | | | |
| — | phase | — | move ≥10 | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "That was their worst piece." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `tempo-handed` ("frees their bishop", `positionalReason.ts:195`) → TW2; a trade move: concession / `bad-trade` record tag (readTrade family; `bad-trade` is a real `MisconceptionTagId`) → TW1.

## F. Build changes
1. New pure `tradesTheirWorst(fenBefore, san, student)` in `theirWorstPiece.ts` (chess.js; reuses the finder on fenBefore).
2. Expose `reason` (`worstReason(w)`) typed.
3. Recipes TW1/TW2 → `mistakeLesson.ts`; the standing text stays for Review/chat.

## G. Proof boards
- `lines-0.jsonl#9719` ("bishop on e… can go nowhere. Leave it there"), `lines-1.jsonl#130` (e7). Guard: `lines-0.jsonl#10569` (already-said).

## H. Open questions
- None.
