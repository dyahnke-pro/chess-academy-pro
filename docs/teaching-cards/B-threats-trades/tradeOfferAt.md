# tradeOfferAt — a quiet move that offers an even trade while ahead

## A. Identity
- File: `src/services/tradeOffer.ts` (85 lines): `tradeOfferAt(fenBefore, san, costCp, afterCp, moverIsStudent)` (41–72), `tradeOfferLine` (74–85). Constants `SOUND_CP = 50`, `AHEAD_CP = 100` (21–23). The student's queen offer a piece or more up belongs to `queenTradeRead` (55).
- Registry: `boardComputers.ts` `tradeOfferAt` (6969), kind `trade`. Census: 1 lesson line, said ("The knight on f4 invites a trade. With a pawn more, the fewer pieces left, the easier the win."). Run: 1 fire (g-1018863294 ply 48 …Nf4, cost 24).

## B. Facts
- **B1** `TradeOffer` (25–~32): `piece`, `square`, `facing {piece, square}`, `up` (the lead in words).
- **B2 dropped:** the lead number (`leadOf`, 51) — only the words.
- **B3 cheap:** the inverse forms: (a) the student was ahead (lead ≥ 1, engine ≥ 100 for the student) and their offer was DECLINED by a retreat that cost ≥ floor; (b) the student was BEHIND and offered / accepted a trade (that is `tradeJudgement` TJ6 / `tradeKeptAt` TK3 — one cause).
- **B4 gates:** cost < 50 and the engine ≥ 100 for the mover after (42); a non-capture by a queen or minor (47); lead ≥ 1 (52); the student's queen offer at ≥ 3 up is `queenTradeRead`'s (55); an even swap on the square with a same-class taker (59–61) and the square guarded by the mover (62–69).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "With {up} more, the fewer pieces left, the easier the win." | — |
| CONSEQUENCE | yes | — | — |
| BETTER MOVE + JOB | n/a | — | for the inverse |
| HABIT | no | — | — |

## D. Lesson recipes
Good-move reader → Review/chat. Mistake inverse **TO-DECLINE** (S): ahead, their equal piece offered a trade, the student retreated / avoided it and cost ≥ floor.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TO1 | strategize (trade when ahead) | S | TO-DECLINE | up, facing | "When you're ahead, trades are your friend: with {up} more, the fewer pieces left, the easier the win." | "Keeping pieces on gives them chances." | "{best} took the trade." | "Ahead, trade pieces, not pawns." | full | the decline won more (cost < floor) | C (B3) |
| TO2 | opponent seat | O | their offer while ahead | — | Review only | | | | | | H |
| TO3 | record | S | — | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | `holdState` on `conversion` (shared with `readConversion`) |

Not applicable: most angles — a narrow good-move read; the behind case belongs to tradeJudgement/tradeKeptAt.

## E. Mistake link
- Student: TO-DECLINE has no cause member today (nearest `no-plan`); it is the same lesson as `readConversion`'s "trade pieces, not pawns" — one cause `conversion-trade`.

## F. Build changes
1. Add `offerDeclined(fenBeforeTheirOffer, theirSan, studentSan, studentCost)` (B3).
2. One recipe with `readConversion` (CV rows) for the ahead-trade lesson.

## G. Proof boards (run)
- Sound offer (Review): g chesscom-1018863294 ply 48 …Nf4 (student Black, cost 24) `3rr1k1/pp3p1p/2b2bpP/q2np2R/8/P1N3Q1/1P2NPP1/2R1KB2 b - - 1 24` → knight f4 facing the knight e2, a pawn up (census lines-1.jsonl:5775).
- No mistake board yet for TO1.

## H. Open questions
- none.
