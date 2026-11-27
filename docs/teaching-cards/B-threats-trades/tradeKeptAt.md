# tradeKeptAt — the even trade the move kept off the board, and why

## A. Identity
- File: `src/services/tradeKept.ts` (247 lines): `tradeKeptAt(input)` (149–207), `reasonFor(input, c, cap)` (87–145), `tradeKeptLine(k, moverIsStudent, fen)` (209–247). Constants `SOUND_CP = 50`, `DECIDED_CP = 300`, `DECIDED_SLACK_CP = 100`, `MIN_LINES = 3` (33–38).
- Registry: `boardComputers.ts` `tradeKeptAt` (7020), kind `capture-choice`. Reach: lesson via moveThoughtFacts (and Review / Learn via the thought). Census: 9 lesson lines, all said ("Taking on f3 was there, but the bishop on g4 is the guard of the pawn on f5. After the trade, your bishop on d3 takes it."). Run: 4 fires, none on a mistake (it only fires on sound moves).

## B. Facts
- **B1** `TradeKept` (46–53): `trade {piece, from, to, captured}`, `reason` (`guard {guarded, by}` | `pressure {king, squares}` | `behind` | `no-threat`), `steppedAway`.
- **B2 dropped:** the other candidate trades with their reasons (the loop returns the first, 205); the cost of the kept trade (`cl` score, 187) — how much worse trading was; the settled lead number behind `behind` (`settledLeadFor`, 128).
- **B3 cheap:** the INVERSE for mistakes — `reasonFor` run on the capture the student PLAYED (the student traded, the trade cost ≥ floor, and a reason not to trade exists): guard (the trading piece guarded something that is now lost), pressure, behind. `reasonFor` is pure and takes any capture.
- **B4 gates:** ≥ 3 engine lines (151); not in check (154); the played move is not a capture and does not itself threaten an equal-or-bigger piece (159–166); the played move is within 50 cp of best (or ≥ 300 and within 100) (174); the trade is even by SEE, takes back exist, and is engine-worse than the move played (175–188); guard / pressure / behind / no-threat reasons (87–145).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | per reason ("trades help the side that's ahead", "Trade only with a reason") | — |
| CONSEQUENCE | yes (guard: "After the trade, your bishop on d3 takes it") | — | — |
| BETTER MOVE + JOB | n/a (good move) | — | for the inverse: the kept-trade move is the better move |
| HABIT | partly | "Trade only with a reason" | — |

## D. Lesson recipes
`tradeKeptAt` explains a GOOD non-trade → Review/chat only. The mistake form is the inverse **TK-TRADED** (S): the student's move WAS an even trade, it cost ≥ floor, and `reasonFor(played capture)` returns a reason.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TK1 | consequence (trading a guard) | S | TK-TRADED, reason guard | piece, guarded, by | "A piece that guards something can't be traded for free: your {piece} on {from} was the guard of the {guarded} on {sq}." / "Before you trade, check what the trading piece is guarding." | "After the trade, their {by} takes the {guarded}." | "{best} kept the trade off." | "Before a trade, ask what your piece was guarding." | full; "your trade" | the guarded piece is defended again by the recapture (`legalSeeGainFor` ≤ 0 after) — already in `reasonFor` 106 | C (B3) |
| TK2 | strategize (pressure) | S | TK-TRADED, reason pressure | squares | "Don't trade a piece that's pressing their king for one that does nothing: yours hit {squares}." | "The pressure on their king is gone." | same | | full | — | C |
| TK3 | strategize (material) | S | TK-TRADED, reason behind | — | "Down material, keep the pieces on: every trade helps the side that's ahead." | — | "{best} kept the pieces on." | "Ahead, trade; behind, don't." | full | shared with tradeJudgement TJ6 — one recipe (the `behind` cause) | C |
| TK4 | knowledge (trade with a reason) | S | TK-TRADED, reason no-threat, cost ≥ floor | — | "Trade only with a reason: their piece threatened nothing, and taking it released the tension for free." | | | | full | owned by `tensionReleased` when that fires (one cause) | C |
| TK5 | opponent seat | O | their even trade abandoned a guard / was made while behind | — | "Their trade gave up the guard of {guarded}: it's loose now." | | | | after the student's reply; if the student then missed it → MD6 | — | C |
| TK6 | record | S | — | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | `holdState` on `bad-trade:<reason>` |

Not applicable: phase (reasons are phase-free; `behind` is the endgame rule too), calculate (the engine's score decides).

## E. Mistake link
- Student: the student's trade that cost — `costReason` **allowed** when the guarded piece falls (TK1, the motif `removing_the_guard` from the student's own side); `bad-trade` reasons (TK2–TK4) shared with `tradeJudgement` (one cause table, keyed by reason).
- Opponent: TK5.

## F. Build changes
1. Export `reasonFor` as `tradeReasonAgainst(fenBefore, capSan, lines, priorMove, theirLast)` (B3) — the inverse call for a played capture.
2. `TradeKept`: add `kept: {costCp}` (how much worse the trade was, B2) and `lead` for `behind`.
3. One cause table for trades: `bad-trade:{guard|pressure|behind|no-threat|pair-given|best-given|opens-file|…}` shared by `tradeJudgement`, `tradeKeptAt`, `tensionReleased` — a trade mistake gets ONE recipe.

## G. Proof boards (run)
- Good non-trade (guard): g chesscom-1013773584 ply 34 …O-O-O (opponent) → the bishop on g4 guards f5; Bxf3 kept off (census lines-0.jsonl:5183 is the student-seat twin).
- Good non-trade (behind): g chesscom-1001055178 ply 47 Bf3 (student, cost 21) → trading rooks on d8 kept off while behind.
- Stepped away: g chesscom-1020632112 ply 26 …Nd4 (cost 0).
- No mistake board yet for TK-TRADED (needs F1 on the saved lines).

## H. Open questions
- none.
