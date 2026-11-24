# emptyCheckAt — the check that goes nowhere

## A. Identity
- `src/services/emptyCheck.ts`: `emptyCheckAt(fenBefore, san, costCp, replyUci)` :30, renderer `emptyCheckLine(e, own, fen)` :46 (3 rotated stems).
- Registry `emptyCheckMove` `boardComputers.ts:6312-6324`; kind `method`; idea `check`, weight 58; claim `empty-check:<squares>`; both seats via `moveIdeaFact`.
- Surfaces: FACT_SET_SURFACES. Census: 13/13 said, lesson only.

## B. Facts
- B1: `{ san, piece, reply, kind: 'block'|'king', squares:[checkerTo, replyTo] }` (:15-22).
- B2 dropped: `costCp` (the price, :31); the move being undeveloped-piece or not; whether the checker is now attackable after the block (the "has to move again" claim is asserted, not checked).
- B3 cheap: after the reply, is the checking piece attacked (`attackers(mv.to, them)`) → "now it has to move again" is TRUE only then; developed-minor count (`developedMinorCount`) → Danya's "don't throw checks with your pieces undeveloped"; did the block DEVELOP a piece (reply piece left its home square) → "the block develops them for free".
- B4: `costCp >= 50` (`EMPTY_CHECK_COST_CP` :25); move gives check and captures nothing (:35); engine reply captures nothing (:38).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "A check only helps when it wins something." | example is the board restated ("they simply block it with g3") |
| CONSEQUENCE | partly | "the piece has to move again" | asserted, not proven (B3) |
| BETTER MOVE + JOB | no | — | best move from the grade |
| HABIT | yes | "Give check when it gains something, not because it's there." | record gate |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EC1 | knowledge | both | fires, kind block | piece, reply | "A check that can just be blocked gains nothing: the block ends it, and the {piece} has spent a move." / "Checks are only strong when they win something. Here one block and the check is over." | "Now the {piece} stands where it can be hit" (only when B3 attacked) | "{best} was the move — it {job}." (errorWhy better + job, past only) | "Give check when it gains something, not because it's there." | after move, student seat: lesson+habit; never name the move just played | not when cost < 50 | H + C |
| EC2 | consequence (tempo) | both | B3: blocker developed a piece | blocker | "A check that lets them block with a developing move hands them a tempo." | "{Their} {blocker} came out for free." | — | EC1 | | blocker came from home square | C |
| EC3 | phase: opening | both | B3: mover has ≥ 2 undeveloped minors | count | "In the opening, a check with your pieces at home is a wasted move: develop first, check later." | — | — | "Pieces out before checks." | | opening (move ≤ 12) | C |
| EC4 | their seat | O | fires for opponent | — | "Their check went nowhere: you stepped aside and they have spent a move." | "You are a tempo up." | n/a | — | Learn: say only if their check was a mistake (cost gate); NEVER the reply SAN — at O seat the reply is the student's next move (`emptyCheckLine` :50 puts `e.reply` in every stem) | | H |
| EC5 | record | S | | | RED/GREY full · AMBER "A check that wins nothing wastes a move." · GREEN silent | | | | | | H |
| — | endgame | — | checks that drive a king ARE useful in endings; the cost gate already excludes them | | | | | | | | |
| — | plan, prevent, strategize | — | n/a — no plan facts in inputs | | | | | | | | |

## E. Mistake link
- errorWhy: no cause kind fits (the cost is lost time, not material) → today these turns land in `positional` only if `positionalReason` tags `tempo-handed`, else `unexplained` (E20, silent). Build F4 is required for any EC row to reach a mistake turn; until then EC1–EC4 are Review/chat only.
- Teaches a `missed` cost with no tactic (the move was simply worse) when the played move was a check: no MistakeCause kind covers "wasted tempo" today → needs cause `positional:tempo-wasted` (or reuse principle `tempo-handed`).

## F. Build changes
1. `emptyCheck.ts:30` add `costCp`, `checkerHit: boolean` (B3), `blockDevelops: boolean`, `homeMinors: number` to `EmptyCheck`.
2. Change the claim at :53/:54 (stems 1 and 2 of `emptyCheckLine` :46) "Now the {piece} has to move again" to be said only when `checkerHit`.
3. Recipe rows EC1–EC4 into `mistakeLesson`; delete the three stems' board restatement ("they simply block it with g3").
4. Add MistakeCause `tempo-wasted` (shared with principle `tempo-handed`).
5. `emptyCheckLine` :50 — drop `e.reply` from the O-seat render (the reply is the student's next move).

## G. Proof boards
- g:1020779996#10 O `Qh4+` reply g3 (block), loss 82, `rnbqkb1r/pppn1ppp/4p3/3pP3/5P2/3P4/PPPN2PP/R1BQKBNR b KQkq - 0 5` → EC1/EC3 (Danya's own Ytkf3 shape).
- g:1002984876#53 S `Rh8+` reply Nf8 (block), loss 81 → EC1. g:1012441262#11 S `Ng5+` reply Ke8, loss 64 → EC1 king branch.
- 11 hits in 12 games, 5 with loss ≥ 100. Guard: checks with a capturing reply (none fired).

## H. Open questions
- Learn speaks "only on a mistake": EC fires from 50 cp (an inaccuracy). Is an inaccuracy a Learn turn?
