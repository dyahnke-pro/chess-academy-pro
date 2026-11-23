# CARD — `studentMovePoint` (the point of a sound move)

## A. Identity
`src/services/playCommentary.ts:829` `studentMovePoint` → text; `studentMovePointFact :~860` → `{text, squares, stakes, line, claim?}`; `slipAnswerText :~935` ("You found it" / "c5 was the answer to their slip"); `quietMovePoint` (unpin, luft, kick), `gainedBishopPair`, `BISHOP_PAIR_POINT`. Census 4/4 (review), kind `point`.

## B. Facts
- **B1** text + `stakes {points, plies}` + `line` (ledger-proven win) + `claim` (kick key).
- **B2 dropped:** the point's KIND (material / exchange / bishop-pair / unpin / luft / kick) is only prose; `net`, `takeBack` count (`:909`) folded into words.
- **B3 cheap:** type the kind; run on the BETTER move after a mistake (its job for the BETTER slot), and on the answer to their slip that the student missed (errorWhy `missed-win` seat S when the prior move was their mistake).
- **B4 gates:** recapture is never a win (`takesBack`, `:887`); net from `settledExchange` over the line (`:899`); "nothing takes it back" from `captureRead` on the board (`:909`); a capture's point is the capture (`:924`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | kind needed |
| CONSEQUENCE | n/a | — | it is a point, not a cost |
| BETTER MOVE + JOB | **yes** | text on bestSan ("That wins the knight on e5 — nothing takes it back safely") | tense ("would have won") |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SP1 | calculate (free piece) | S mistake | errorWhy `missed-win` motif hanging_piece; bestSan point kind material | target | "When their piece has no guard, take it: check captures before anything else." / "A loose piece is free material." | | "Nxe5 won the pawn — nothing takes it back." | "Every move, look at captures first." (focus wording) | move held while playable | point must be ledger-proven (`net >= takenVal && takeBack === 0`) | H |
| SP2 | punish their slip | S mistake | prior move = their mistake (errorWhy seat them) AND student played other than its answer | answer, point | "When they slip, the best reply is usually the forcing one: look for what their move left loose." | "Their slip goes unpunished." | "c5 was the answer to their slip, kicking the rook." (`slipAnswerText` 'missed') | "After every move of theirs, ask what it left behind." | same, past only | answer from engine best on the board after the slip | H |
| SP3 | knowledge (bishop pair) | S/O | better move gains the pair | | "Two bishops are worth more than bishop and knight in an open position." | | "Bxf6 kept you the two bishops." | | Review only unless cost | | H |
| SP4 | knowledge (luft) | S mistake | errorWhy `allowed-mate` back rank, better = luft point | | "Give your king a square before it needs one: a back-rank king dies to one check." | | "h3 made luft." | "Ask: can my king breathe?" | same | | H |
| SP5 | unpin | S mistake | better = unpin point | | "A pinned piece can't fight. Break the pin before they pile on it." | | "Kh1 unpinned the knight." | | same | | H |

## E. Mistake link
`missed-win` (SP1), the student's missed answer to `them`-seat mistakes (SP2), `allowed-mate` back rank (SP4); BETTER slot for most material causes.

## F. Build changes
1. `MovePointFact` (`:~853`) — add `kind: 'wins'|'exchange'|'bishop-pair'|'unpin'|'luft'|'kick'`.
2. Tense: a `past` form for the better move ("would have won …") read by the composer, not new prose here.
3. SP1–SP5 into `mistakeLesson` (`missed-win`, the `slip-unpunished` sub-case of `missed-win` with prior-move-was-their-mistake).

## G. Proof boards
- Census (Review): "e4 prepares e5, which would kick their knight." (`lines-0.jsonl:55`); "g3 kicks their queen off h4, gaining time." (`lines-1.jsonl:2525`); "c3 makes luft…" (`lines-0.jsonl:4215`).
- SP1: chesscom-1002984876 ply 13 Bg5 (S, cost 185) `rn1k1b1r/ppp2ppp/5n2/4p3/4P1b1/5N2/PPP2PPP/RNB1K2R w KQ - 0 7` — best Nxe5 wins a pawn (missedRead hanging_piece); Learn would hold Nxe5 while it is still playable (pastBetterNameable true here → named).

## H. Open questions
1. SP2 is the "their slip, your chance" lesson — today Learn says it before the student moves ("You found it" after). In mistakes-only Learn, only the missed case speaks?
