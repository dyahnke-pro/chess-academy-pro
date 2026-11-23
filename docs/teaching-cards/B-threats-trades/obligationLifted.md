# obligationLifted — their move freed you from a duty

## A. Identity
- File: `src/services/obligationLifted.ts` (70 lines): `obligationLifted(fenBefore, fenAfter, student)` (34–66), `obligationLiftedLine(o)` (68–70).
- Registry: `boardComputers.ts` `obligationLifted` (2373–2384), kind `their-read`, seat `opponent`, claim `lifted:<sq>`.
- **Duplicate (rot):** `opponentMoveReads.obligationLifts` (264–320) computes the same claim from three boards (it also requires that the student had guarded it) and renders it in three other stems. The census holds 12 obligationLifted lines as "subsumed by" the readTheirMove twin ("Their bishop left d7, so your pawn on g4…" subsumed by "With their bishop on c6, your pawn on g4 no longer hangs…").
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 41 lines (11 said): chat 15, review 11, lesson 15; held 9 `same-idea`, 6 `in-flux`, 12 subsumed by the twin. Run: 22 fires (12 on their moves, 10 swapped).

## B. Facts
- **B1** `ObligationLifted` (11–18): `square`, `piece` (the student's piece no longer under fire), `from`, `to`, `theirPiece` (the attacker that left).
- **B2 dropped:** the `computeMustDefend` value of the piece before (`was`, 47) — how much the duty was worth; other pieces still hanging (`now`, 49) — a lifted duty while another piece still hangs is a different turn.
- **B3 cheap:** whether the student's NEXT move still spent itself on the lifted duty (added a guard to `square` / moved the piece) — the wasted move; what the freed move could have done (the engine's best).
- **B4 gates:** their move only (37); the piece hung before (SEE, 47), not now (52), still on its square (53–54), the moved piece attacked it before and does not now (56–57). No cp gate.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "you don't have to spend a move guarding it now" | the rule ("re-check your duties after every move") |
| CONSEQUENCE | partly | the move is free | what to do with it (B3) |
| BETTER MOVE + JOB | no | — | the engine's best with the freed tempo |
| HABIT | no | — | — |

## D. Lesson recipes
Cause **OL-WASTE** (S): their move lifted the duty, the student's next move still guarded `square` (or moved `piece` away) and cost ≥ floor.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OL1 | recognize (the duty is gone) | S | OL-WASTE | piece, their piece | "Duties change every move: once their {theirPiece} left {from}, your {piece} on {sq} no longer needed you." / "Check what their move stopped attacking — a guard you no longer need is a free move." | "Your move went to a job that was already done." | "{best} used the free move: {job}." | "After every move of theirs, re-check what still needs guarding." | full; "your move" | another piece still hangs (B2 — then the guard is right) | C (B3) |
| OL2 | opponent seat | O | their move lifted a duty of THEIRS on the student's last move and they spent the next move guarding anyway (cost ≥ floor) | — | "They kept guarding a piece that was already safe." | | | | Review | — | C (swapped call) |
| OL3 | record | S | — | — | RED/GREY full · AMBER "That guard wasn't needed any more." · GREEN silent | | | | | | `holdState` on `tempo-handed` |

Not applicable: calculate / plan / phase / structure (a one-move duty read). The standing "you don't have to guard it" line with no wasted move is not a mistake → silent in Learn (Review/chat only).

## E. Mistake link
- Student: `positionalReason` **tempo-handed** / **no-plan** when the wasted move was a guard — this computer names WHICH duty was already gone (the generic note cannot).
- Opponent: OL2.

## F. Build changes
1. Delete `opponentMoveReads.obligationLifts` (264–320) and its `readTheirMove` call (600); one computer, one claim (`lifted:<sq>`). Port its one extra gate (the student had guarded it, 280) into `obligationLifted` as a field `wasGuardedByStudent` rather than a filter.
2. Add `wasWorth` (the `computeMustDefend` value before, B2) and `stillHanging: string[]` (B2) to `ObligationLifted`.
3. Add `spentOn(fenAfter, studentSan, o): boolean` (B3) → cause OL-WASTE in `mistakeLesson`.

## G. Proof boards (run)
- Lift: g chesscom-1018307238 ply 27 Rfe1 (opponent White, cost 142) `r1b1r1k1/pppp2pp/5n2/5p2/2P5/2N1P1P1/PP4BP/R4RK1 w - - 3 14` → `{square f5, pawn, from f1, to e1, rook}` — the student's next move (…Ng4, cost 175) is the OL-WASTE candidate to check with F3.
- Lift: g chesscom-1020779996 ply 46 …Qg7 (opponent Black) → pawn b4 freed.
- Twin said, original held: lines-0.jsonl:1564 (readTheirMove said) vs lines-0.jsonl:1568 (obligationLifted held as subsumed).

## H. Open questions
- none.
