# CARD — `opensCheck` (a move that clears a line for a check)

## A. Identity
`src/services/opensCheck.ts:48` `opensCheck(fenBefore, san, line SAN, mine, tense)` → `OpenedCheck {piece, from, to, check, movesLater: 2, clause, squares}` (`:18`). Census 2/2 (lesson), kind `does`.

## B. Facts
- **B1** as typed; clause "opens your rook's file to g7, and Rg7+ comes a move later".
- **B2 dropped:** what the check DOES (wins material? mates? just checks) — not read; `opened` list beyond the used one.
- **B3 cheap:** (a) the MISTAKE seat: the student's piece moved off a line in front of THEIR king-side… i.e. run on the student's move with `mine=false` perspective? No — run on THEIR reply line after the student's move: their move opened a check that wins (ledger over the check line) = consequence of the student's mistake (a discovered road); (b) the student's own move opened THEIR line? (a pawn move opening a diagonal to the student's king: e.g. f3/f4 opening h4–e1) — detect: after the student's move, their checks through the square the student vacated (same `between` test, roles swapped) — the classic "f-pawn move opens the e1–h4 diagonal" mistake.
- **B4 gates:** move gives no check itself; the check square safe; the check played on the mover's SECOND move in `line` (the next move's is deepFact's, `:93`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | — |
| CONSEQUENCE | partly | clause | its result (B2) |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OC1 | geometry (own king) | S mistake | B3b: the student's pawn/piece move opened a line from their piece to the student's king and that check is in their line (errorWhy king-hunt/allowed-mate/allowed-capture) | line, check | "A pawn that moves off your king's diagonal opens it: f3 opened h4 to their queen." / "Before moving a pawn near your king, ask which line it opens." | "…Qh4+ comes down the diagonal." | | "Ask what line each pawn move opens toward your king." | same | the check must be in their engine line | C |
| OC2 | combination (theirs) | S mistake | B3a | | "A quiet move can clear the road for a check a move later: look for their pieces' lines, not just their pieces." | | | | same | | C |
| OC3 | own plan | S | good move | | Review only | | | | silent | | H |

## E. Mistake link
`king-hunt`, `allowed-mate`, `allowed-tactic` motif `discovered_check`/`discovered_attack` (OC1/OC2).

## F. Build changes
1. Add `opensLineToOwnKing(fenBefore, san)` (B3b) — the roles-swapped `between` test; input to errorWhy's cause (`cause.opened`).
2. Add `result` to `OpenedCheck` (ledger over the line from the check).
3. OC3 leaves Learn.

## G. Proof boards
- Census: "Your move opens your rook's file to g7, and Rg7+ comes a move later." (`lines-0.jsonl:5635`); "Their Be3 clears the way for their rook to check on f1, and Rf1+ comes a move later." (`lines-2.jsonl:7771`, OC2 shape on the student's side).
- Pure run: `opensCheck(best)` fired 0 of 109; OC1 boards to search (the king-hunt causes: chesscom-1018307238 ply 11 d4 "…Bxc3+ and …Qe7+", chesscom-1001055178 ply 58 …Rc7 "Bh5+ and Rd7+").

## H. Open questions
None.
