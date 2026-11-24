# CARD — `deepFact` (what the move sets up a move later)

## A. Identity
`src/services/threeFacts.ts:143` `deepFact(fenBefore, san, line SAN, moverIsStudent)` → `DeepFact` (`:34`); `deepFactRead`; `DEEP_FACT_PROVEN_MOVES`; dedupe `campNamesDeep`. Census 90/90 (lesson 54, review 36), kinds `two-jobs`, `deep-fact`.

## B. Facts
- **B1** `{text, verb, target, squares, follow {piece, from, to, san, uci}, hit {square, type, words}, opener {san,from,to}|null, lineIndex}`.
- **B2 dropped:** `via` (the path square), `forcedSoFar`, `stoodStill` (`:160-200`, `forcedSoFar :160`, `via :167`, `stoodStill :196`) — whether the follow-up was forced; whether the hit WINS (ledger) is not read — "hits their rook on a1" is a hit, not a win.
- **B3 cheap:** (a) run on the BETTER move's line (the better move's deep job: "Rg8 heads to g6, hitting the bishop on h6"); (b) run on THEIR reply line after the student's mistake: their move sets up a hit two moves on → the consequence's second step; (c) the ledger over the follow-up (win or just a hit).
- **B4 gates:** line ≥ 2; a check ends it (`:179`); a recapture of the moved piece ends it (`:186`); same mover (`:194`); the read itself is `deepFactRead :150`.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | — |
| CONSEQUENCE | yes (on their line) | `verb` | must be run on their reply line (B3b) |
| BETTER MOVE + JOB | yes (on best line) | `text` | names the student's next move (`follow.san`) — only past |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DF1 | calculate (two moves) | S mistake | deepFact on THEIR reply line after the played move, and the hit is the errorWhy cause's target | follow, hit | "A quiet move can be a threat two moves deep: ask where their piece is heading, not just where it stands." | "Their knight heads to c5 and hits your queen on d3." | | "Look two moves ahead for their pieces: where are they going?" | same | hit must be the cause's lost/attacked piece | C (B3b) |
| DF2 | own plan | S mistake | deepFact on best line, cost ≥ mistake | follow, hit | "Good moves often work a move later: the piece is heading somewhere." | | "Rg8 would head to g6 and hit the bishop on h6." | | same (past) | `pastBetterNameable` | C (B3a) |
| DF3 | both seats | O mistake | their move had no deep job and the student's deep shot came | | pointer → H | | | | held | | C |

## E. Mistake link
Consequence for `allowed-threat` / far `allowed-capture` (DF1), BETTER slot for `positional misplaced-piece` / `no-plan` (DF2). Pure run: deepFact on the BETTER line fired on 12 of 109 of David's costly moves (e.g. ply 46 …Rxf2: "Nb7 heading to c5, where it hits their queen on d3").

## F. Build changes
1. `DeepFact` — add `wins: boolean` (ledger over the follow-up) and `forced: boolean`.
2. Call sites for mistakes: `deepFact(fenAfter, replySan, replyLine.slice(1), false)` for DF1 and on `bestSan` for DF2 (inputs to `mistakeLesson`).
3. Learn: the good-move "It also heads on to e4…" lines leave Learn.

## G. Proof boards
- DF2 pure run: chesscom-1012441262 ply 26 …Kg8 `r4r2/pppqpkNp/2np1npB/7b/3PP3/2P3QP/PP3PP1/RN2K2R b KQ - 2 13` → best Rg8 "heading on to g6 a move later, where it hits their bishop on h6"; ply 46 …Rxf2 `5rk1/p1p4p/1p1p2p1/n2Pp3/P3N3/2PQ2PP/1q3P2/R4RK1 b - - 0 23` → best Nb7 "heading on to c5, where it hits their queen on d3".
- Census: "It also opens the way for their queen to h4, where it gives check to your king once your f4 opens the diagonal." (`lines-1.jsonl:3392`) — the DF1 shape (their deep fact).

## H. Open questions
1. DF2 names the student's planned follow-up of the better move — fine once the move is past?
