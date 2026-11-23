# findEnablingMove — first this, then that

## A. Identity
- `src/services/enablingMove.ts:41` `findEnablingMove(fen, pvUci)`; proof `enablingMoveProof` :70; line `enablingMoveLine` :87. Also called from `bookMoveWhy.ts`.
- Registry `enablingMove` `boardComputers.ts:1829-1842`, kind `move-order`, claim `order:A>B`, seat `student`, `namesStudentMove: true`, mark draws A. Census 21/19.

## B. Facts
- B1: `{ first {san,from,to}, then {san,from,to,piece}, opened, fen }` (:19-26).
- B2 dropped: nothing material; the reply in between (pv[1]) is played but not returned.
- B3 cheap: the PLAYED move's relation: did the student play B-like move order wrong (tried a different move and B never became possible); or played A-less: the student's move was the B piece going elsewhere. Simplest: on a mistake turn where best = A and the engine line's B needs A, the lesson is "A was the preparing move".
- B4: pv ≥ 3 (:42); A non-capture (:50); B a slider (:53); not the same piece (:57); B not onto A's square (:61); B illegal now (:63); A on B's road (:66).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "d5 first, then Be6: your d-pawn stands in the way of your bishop, and moving it clears the road." | pre-move; names the student's move |
| CONSEQUENCE | no | — | what B does when it lands |
| BETTER MOVE + JOB | yes | first + job "clears the road" | after the move only |
| HABIT | no | | "When a piece can't reach its square, ask which of your own pieces is in the way." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EM1 | plan / order | S | mistake turn, best = A, enablingMove fires on bestPv | blocker, piece | "Sometimes your own piece is in the way of your best plan: the {blocker} stood on the {piece}'s road." | "{B} would have {B's point}" (moveIntent on B) | "{A} first, then {B}." | EM habit | after move | B must be part of the line that makes best best (cost gap) | H + C |
| EM2 | their seat | O | same for their mistake | | "Their own {blocker} blocked their {piece}; clearing it first was their plan." | — | n/a | — | Review only (no student lesson) | | H |
| EM3 | record | S | | | RED/GREY EM1 · AMBER "Clear the road first." · GREEN silent | | | | | | H |
| — | calc, endgame, prevent | — | n/a | | | | | | | | |

## E. Mistake link
- costReason `missed` where the missed line's key move is B (rook to the file, bishop to the diagonal); principle `wrong-move-order`. Student seat.

## F. Build changes
1. Return the reply `between: san` (B2).
2. Registry Learn read: only on the mistake turn with best = A (drop pre-move say).
3. Cause `wrong-move-order` → EM1 recipe (shared with orderByThreat, pieceOutFirst).

## G. Proof boards
- g:1001055178#41 S `Kh1` best `Qh5` loss 113, `1r1r2k1/1p1q1pp1/p1p1p2p/2P5/3b1P2/6P1/P4PBP/1R1Q1RK1 w - - 1 21` → A `Qh5` clears d1 for `Rfc1`. Check at build: is Rfc1 the point of Qh5 (the engine line), or a by-product? (EM1 guard.)
- g:1001055178#21 S `f4` loss 24 → A `Nd2` clears b1 for `Rc1` (not a mistake → silent).
- Danya: vc-1671V8LrEwk-26, vc-1rcEbI44WqE-45.

## H. Open questions
- None.
