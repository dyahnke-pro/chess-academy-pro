# CARD — `ruleException` (breaking a rule for a reason)

## A. Identity
`src/services/ruleException.ts:70` `ruleException(fenBefore, san, historySans)` → `RuleException {rule: 'twice'|'shield-pawn'|'early-queen', text, squares}` (`:28`, not exported); `hitBy :38`, `centreClosed :55`. Caller passes only moves within 20cp of best (header `:6`). Census 12 offered / 4 said (lesson 8, review 4), kind `rule-exception`.

## B. Facts
- **B1** rule + text ("…Nd4 moves the same piece twice — usually a waste of time in the opening, but here it hits the queen on b5").
- **B2 dropped:** `hit` target piece/square typed (only in text/squares); the development lead number (`lead`, `:102`).
- **B3 cheap — THE MISTAKE SIDE:** the same three rules detect the BROKEN-WITHOUT-REASON case: the rule is broken (same piece twice / shield pawn / early queen), `hit` is null, no lead, and the move cost ≥ mistake → the rule applies → that is a positional lesson (overlaps `pieceMovedAgain` for 'twice'). Today that branch falls through (`why` null at `:103-106`, `:117-120`; final `return null :127`; "a rule broken for no visible reason is the engine's secret").
- **B4 gates:** fullmove ≤ 12 for twice (`:88`); history must reach the same board (`:98`); wasHit → excused (`:100`); queen move by move 10 with 2 minors home; shield pawn needs their queen on.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | **yes** (rule + exception) | text | — (but on a GOOD move) |
| CONSEQUENCE | partly | hitWords | — |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RE1 | rule (twice), mistake | S mistake | B3: twice, no hit, no lead, cost ≥ mistake | piece | "Moving the same piece twice in the opening hands them a free move — unless it wins something." | "Their development gets a move ahead." | better develops another piece | "Every opening move: a new piece, or a reason." | same | not when chased (`wasHit`) | C |
| RE2 | rule (shield pawn), mistake | S mistake | B3: f/g pawn in front of castled king, no hit, centre open, cost ≥ mistake (errorWhy positional weakened-king-safety / king-hunt) | pawn | "Every pawn move in front of your king leaves a hole you can't take back." | "…Qh4 now has a way in." | | "Before you push a king-side pawn, ask what square it gives up." | same | their queen on | C |
| RE3 | rule (early queen), mistake | S/O mistake | B3: early queen, kicked after | | "An early queen gets chased: every move it runs is a move they develop." | "Nc3 hits it and gains the time." | | | same | | C |
| RE4 | exception (good move) | S | as today | | Review only (no mistake) | | | | silent | | H |

## E. Mistake link
positional `neglected-development`, `tempo-handed` (RE1, RE3), `weakened-king-safety` / `king-hunt` (RE2). Pure run: ruleException fired on 2 of David's costly moves (Qf3 early-queen, …f6 shield-pawn) — those are moves within the excused shape, the mistake branch needs B3.

## F. Build changes
1. Export `RuleException`; add `broken: boolean` (B3) returning the rule with no excuse on a costly move.
2. Merge 'twice' with `pieceMovedAgain` (two computers on one rule) — `pieceMovedAgain` owns twice/detour/back/count, ruleException owns the exceptions.
3. RE1–RE3 recipes.

## G. Proof boards
- Census: "…Nd4 moves the same piece twice — usually a waste of time in the opening, but here it hits the queen on b5." (`lines-2.jsonl:5592`); "An early queen move usually just gets kicked around — but …Qf6 earns it: it hits the knight on e5." (`boards-0.jsonl:741`).
- Pure run: chesscom-1020632112 ply 15 Qf3 (O, cost 318) `r1b1k2r/pppp1Npp/2n5/4p3/2B1n2q/4K3/PPPP2PP/RNBQ3R w kq - 2 8` → early-queen (with a hit); chesscom-1042725180 ply 38 …f6 (S, cost 100) `r1q1r1k1/1b3pbp/ppn1p1p1/2ppP3/2P2P2/P2PBB1P/1P2N1P1/1R1Q1R1K b - - 0 19` → shield-pawn — an EXCUSE said on a costly move: guard (RE4 is said only within 20cp of best).

## H. Open questions
None.
