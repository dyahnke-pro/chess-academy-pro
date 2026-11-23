# settledExchange — the whole exchange, counted to where it ends

## A. Identity
- File: `src/services/exchangeLedger.ts` (783 lines): `settledExchange(fenBefore, sans, studentColorWB, prior)` (389–409) → `walkLedger` + `finishedAt`; `ExchangeLedger` (27–55); siblings `computeExchangeLedger` (148), `settledNetForLine` (312), `describeProofResult` (580), `proofCut` (437).
- Registry: `boardComputers.ts` `tradeSettled` (2200–2275, computer `settledExchange`, kind `trade` / `delta`), seat = the mover; a plain even trade is not said (2271).
- Reach: learn door, review, lesson, chat, tapped, tactics (the exchange-ledger row). Census: 78 lines, all Review (71 said; held 5 `in-flux`, 2 `beside-mate`): "They take on d4 — taking back would cost you more than the pawn." / "You take on g5, and they can take back — a bishop trade, and you win the queen." Run: 120 fires (65 student captures, 55 theirs); 10 on a capture costing ≥ 100.

## B. Facts
- **B1** `ExchangeLedger`: `studentWon[]`, `opponentWon[]` (piece letters in order), `netPawns` (student's seat), promotions, `isExchange`, `settled`. The registry derives `traded`, `restPart`, `safeBack` (can take back without loss), `costlyGrab` (2236–2256).
- **B2 dropped (registry level):** the ply the exchange settles at (`k`, 405) — how long the sequence is; WHY taking back costs more (the recapture square is attacked again / a pin) — `safeBack` is a boolean from the line or SEE (2253); the `prior` merge (a recapture counted with the move before) is not reported.
- **B3 cheap:** the move that makes the take-back cost (the line's ply after the recapture), from the same walk; the capture count on the square (attackers vs defenders) — chess.js.
- **B4 gates:** the capture must start an in-flux square (`inFluxAfter`, 2208); the line must finish the exchange (402–407) else null; "can take back" only when the line retakes or SEE ≥ 0 and the engine does not call it costly (`MISTAKE_CP`, 2245–2254); a plain even trade is not said (2271).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | the counting rule |
| CONSEQUENCE | yes | the ledger words ("a bishop trade, and you win the queen") | — |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
Causes: **SE-GRAB** (S): the student's capture loses by the settled ledger (`netPawns < 0` for the student, cost ≥ floor); **SE-RECAP** (S): the student took back where taking back cost more (their capture was `!safeBack` for the student and the student retook anyway, cost ≥ floor); **SE-LEFT** (S): their capture took a student piece the student cannot take back (the consequence of a hanging piece — MD4/MD5's line).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SE1 | calculate (count to the end) | S | SE-GRAB | ledger | "A capture is only good if the whole exchange ends in your favour: count every take-back first." / "A piece is only free if nothing can take back — here they take back and win {net}." | "{ledger words}: you come out {net} down." | "{best}." | "Before you capture, count attackers and defenders on that square to the end." | full; "your capture" | the loss is a deliberate sacrifice the engine likes (cost < floor) | H |
| SE2 | recognize (don't take back) | S | SE-RECAP | why | "Taking back isn't automatic: here the recapture costs more than the {lost}." / "A recapture can be a trap — check what hits the square after you take back." | "{why: the square is hit again / it's pinned}." | "{best} — not the recapture." | "Before you recapture, ask what attacks the square next." | full | `kneeJerk` owns the 'reflex recapture' habit (one habit table) | C (B3) |
| SE3 | consequence (lost for nothing) | S | SE-LEFT | piece | (consequence slot for MD4/MD5) "They take on {sq}, and you can't take back: the {piece} is gone." | | | | consequence slot | — | H |
| SE4 | knowledge (counting order) | both | any exchange | — | "In an exchange, the cheapest piece takes first; count with the cheapest attackers first." | | | | Review/chat | | H |
| SE5 | opponent seat | O | their capture loses by the ledger and the student took the gift (no student mistake) | — | silent in Learn (no mistake by the student; their mistake already said by `readTheirMove` RT3) | | | | | | |
| SE6 | record | S | — | — | RED/GREY full · AMBER "Count the exchange to the end." · GREEN silent | | | | | | `holdState` on `miscounted-exchange` (new) |

Not applicable: plan / phase / structure (a material count).

## E. Mistake link
- Student: `costReason` **allowed** with motif `hanging_piece` / null where the blow is the take-back (SE1); `whyItFailed` **held-by-defender** ("the capture loses the exchange after recaptures") = SE1 exactly — one cause, the ledger supplies the count; SE2 = a recapture mistake (`whyItFailed` **answered-by-tactic** when an in-between move punishes the recapture).
- Opponent: SE5.

## F. Build changes
1. Return `settledAtPly` and `retakeCost: { by: san, square } | null` from `settledExchange` (B2/B3) so SE2's "why" is a field.
2. `whyItFailed` 'held-by-defender' and this ledger compute the same claim — make `whyItFailed` read the ledger (one exchange computer), so the count and the cause never disagree.
3. Move the registry's words (2256–2264) into the CONSEQUENCE stems of the recipe table; the registry keeps only the ledger.

## G. Proof boards (run)
- SE1 shape (student capture that costs): g chesscom-1012441262 ply 35 Bxf8 (cost 268) — the ledger plays …Rxf8 and the rest of the engine line.
- Census: lines-0.jsonl:99 "They take on d4 — taking back would cost you more than the pawn." (SE2's guard: the student did NOT take back — correct play, silent in Learn); lines-0.jsonl:165 (a capture that wins the queen — no mistake).
- Guard (in-flux): lines-0.jsonl:215, 2270.

## H. Open questions
- none.
