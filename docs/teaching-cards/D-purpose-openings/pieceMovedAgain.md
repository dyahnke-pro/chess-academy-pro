# CARD — `pieceMovedAgain` (one piece moved again while the others wait)

## A. Identity
`src/services/pieceMovedAgain.ts:105` `pieceMovedAgain(history, san, student, costCp)` → `MovedAgain {kind: 'detour'|'back'|'count', mover, key, squares, text}` (`:38-46`); `pieceTrips`, `homeMinors`. Census 38/34 (lesson 25, review 13), kinds `fundamental`, `principle`.

## B. Facts
- **B1** kind + text ("That's their queen's fourth move, and their knight on g1 and bishop on f1 still haven't moved." / "Two moves to get their bishop to a3: it could have gone there straight from c1.").
- **B2 dropped:** `t.moves` (count), `home` list, `kicker` (who chased it), `chased` — prose only.
- **B3 cheap:** link to the cost — the move's cost against `homeMinorCount` delta of the better move (errorWhy positional `neglected-development`/`tempo-handed`).
- **B4 gates:** history < 30 plies (`OPENING_PLIES`); no capture/check; n/b/q only; fine (< 30cp) and not chased → null (`FINE_CP = 30 :32`, `:141`, `:169`); a landing that hits a winnable piece → null (`:146`); history < 30 plies checked `:106`.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | text (states the count, implies the rule) | the rule sentence |
| CONSEQUENCE | partly | "still haven't moved" | — |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MA1 | count | S mistake | kind count, cost ≥ mistake | piece, n, home | "Moving one piece again and again while the rest sit at home hands them the development lead." | "The knight on b8 and bishop on f8 are still at home." | better develops | "Count your pieces still at home." | same ("That's your knight's third move…") | | H |
| MA2 | detour | S mistake | kind detour, cost ≥ mistake | origin, to | "Two moves to reach a square you could reach in one is a free move for them." | | | "Before a piece moves, ask: where does it really want to go?" | same | | H |
| MA3 | back (chased) | S mistake | kind back + kicker | kicker | "A piece where a pawn can kick it comes back home and costs you the time." | | | "Put pieces where pawns can't chase them." | same | | H |
| MA4 | queen | S/O | piece q | | "An early queen is a target: every kick is a free developing move for them." | | | | | | H |
| MA5 | both seats | O mistake | their piece moved again | | "When they waste moves with one piece, open the position before they catch up." | | | | Learn: lesson only, no student move named | | H |

## E. Mistake link
positional `neglected-development`, `tempo-handed`, `misplaced-piece` (opening). Pure run: fired on 3 of David's costly moves (…Bb4 detour, …Qe7 count, Qd4 count).

## F. Build changes
1. Expose `moves`, `home`, `kicker` as fields.
2. In the cause join: `cause.movedAgain` when errorWhy is positional and this fires.
3. The text stays a CONSEQUENCE renderer; the LESSON comes from the recipe (MA1–MA5).

## G. Proof boards
- Pure run: chesscom-1002984876 ply 18 …Bb4 (O, cost 309) `r2k3r/pppnbppp/5n2/4p1B1/4P1b1/2N2N2/PPP1BPPP/2KR3R b - - 5 9` → detour; chesscom-1013773584 ply 18 …Qe7 (O, 133) `rn1qkbnr/pp1b1pp1/2pp3p/8/3PPB1P/2N2N2/PPP3P1/R2QKB1R b KQkq - 1 9` → count; chesscom-1018863294 ply 21 Qd4 (O, 219) `r3kb1r/pp1bpppp/5nn1/q2P4/5B2/2N1Q3/PP3PPP/R3KBNR w KQkq - 3 11` → count.
- Census: "That's your knight's third move, and it's back on c6 after the pawn on c3 kicked it." (`boards-2.jsonl:1483`).

## H. Open questions
1. MA5 (their wasted moves) in Learn: a lesson for the student's NEXT plan ("open the position") — is that a pointer?
