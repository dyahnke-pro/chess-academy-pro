# CARD — `lineCut` (the move blocks one of your own lines)

## A. Identity
`src/services/lineCut.ts:28` `lineCut(fenBefore, san, mine)` → `LineCut {piece, lost, squares}` (`:12`). Census 103/81 (lesson 88, review 15), kind `aspect-own-weakness`; verdict "S (no consequence)".

## B. Facts
- **B1** piece ("your bishop"), lost ("your pawn on d4" / "their knight on c3" / "d4"), squares [from, to, sq].
- **B2 dropped:** the candidate's `weight` (own guard 3 / enemy attack 2 / centre square 1, `:55-57`) = WHAT KIND of cut (a guard removed vs an attack blocked vs a square) — dropped; whether the cut guard was the ONLY guard; whether the enemy piece that is no longer attacked can now do something.
- **B3 cheap:** (a) kind; (b) consequence: for a guard cut — `attackers(sq, them)` vs `attackers(sq, me)` after the move (is the piece now loose? SEE gain for them); for an attack cut — was the attack a real threat before (SEE ≥ 1 before); (c) link to errorWhy: the cut guard's square == `lostSquare` (the cut is the mechanism).
- **B4 gates:** no capture moves (`:34`); moved piece's own line skipped (`:42`); own pieces only if central or attacked (`:55`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | kind |
| CONSEQUENCE | no | — | B3b ("It also cuts your queen off from your pawn on d4" says nothing of what that means) |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | geometry (interference, self) | S mistake | kind guard-cut AND cut square == errorWhy lostSquare | piece, guarded | "A piece dropped onto your own line can cut a guard: your knight on e4 now stands between the queen and the pawn it guarded." | "The pawn on d4 has lost its guard and falls." | better job | "Before you put a piece somewhere, ask whose line it blocks." | the landing square is not said (it IS the move just played): "A piece dropped onto your own line can cut a guard: the knight now stands between your queen and the pawn on d4." | must be the mistake's cause | C |
| L2 | attack blocked | S mistake | kind attack-cut, the attack was a real threat (SEE ≥ 1 before), cost ≥ mistake | | "Don't block your own attack: the bishop was hitting the knight until your move stood in the way." | "Their knight is free again." | | | same | | C |
| L3 | (description) | — | kind square-cut alone | | silent (description, no cost) | | | | silent | — | H |
| L4 | both seats (interference motif) | O | their move cuts their own guard → student wins | | pointer → H1 | | | | held | | C |

## E. Mistake link
`abandoned-defender`-like cases where the guard was blocked rather than moved (L1) — errorWhy today only sees a guard that MOVED (`whyItFailed` abandoned-defender checks `mv.from` among defenders); a guard blocked by the moved piece is a gap there. `positional misplaced-piece` (L2).

## F. Build changes
1. `LineCut` — add `kind: 'guard'|'attack'|'square'`, `onlyGuard: boolean`, `nowLoose: boolean` (B3).
2. `whyItFailed.ts` — add the blocked-guard case to the abandoned-defender test (a defender whose line now passes through `mv.to`), emitting `abandoned-defender` with `blocked: true` — the mistake computer finds it, lineCut supplies the geometry.
3. Learn: delete the stand-alone "It also cuts your bishop off from …" (88 lesson lines, no consequence).

## G. Proof boards
- Census: "It also cuts your queen off from your pawn on d4." (`boards-3.jsonl:2761`, vc-26ZXZEiudhA-35); "It also cuts their queen off from d4." (`boards-0.jsonl:2516`).
- Pure run on David's costly moves (5 of 109): chesscom-1013773584 ply 18 …Qe7 `rn1qkbnr/pp1b1pp1/2pp3p/8/3PPB1P/2N2N2/PPP3P1/R2QKB1R b KQkq - 1 9` → bishop f8 cut from pawn d6 (cause there: misplaced/development — L1 guard: d6 not lost → silent); chesscom-1005776142 ply 36 …b4 `r1b1r1k1/p4pbp/6p1/qpB5/3pPP2/P2P3P/1P1NQ1P1/R3K2R b KQ - 0 18` → queen a5 cut from knight d2 (L2 candidate: the queen's attack on d2 blocked).

## H. Open questions
None.
