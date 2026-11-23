# kneeJerk — the reflex recapture

## A. Identity
- File `src/services/kneeJerk.ts` (23 lines), function `kneeJerk(theirLast, playedSan, bestSan, cpLoss)` :15.
- Registry `kneeJerk` `src/services/boardComputers.ts:4842-4854`; kind `rule`; key/claim `method:knee-jerk` (once a game); seat always `student`; `namesStudentMove: false`.
- Surfaces: `BUNDLE_SURFACES` + `lesson: SLIP_HABIT_LESSON`, `weaknesses: SLIP_HABIT_WEAK`. Census: review only, 5 said / 5 fired (lines-0:229, lines-1:204, lines-1:2861, lines-2:253, lines-2:3113). Never in Learn on the 16 games.

## B. Facts
- B1 handed over: one string — "Taking back was the reflex — but a recapture can usually wait a move, and here {bestSan} came first. Before every recapture, ask whether something stronger comes first." (:22). No typed fields at all.
- B2 computed and dropped: `sq` — the square of their capture and of the recapture (:17); the fact that best is not a capture on `sq` (:20); `cpLoss` (:16). The registry re-derives the landing square (`moveTo`) but not why `bestSan` came first.
- B3 cheap: from `fenBefore` + `bestSan` with chess.js: is best a check (`+`), a capture elsewhere, a threat on a bigger piece (same test as `inBetweenMove` :171-178); is the recapture still available after best + reply (replay bestLine — `inBetweenMove(fen, bestPv, 'best')` already answers this exactly); what the recapture costs (the reply line after the played move, via `errorWhy`).
- B4 gates: `cpLoss >= 100` (`KNEE_JERK_COST_CP` :13); their last move captured (`/x([a-h][1-8])/` :17); played captures on the same square; best does NOT capture on it (:20). String matching on SAN only — a promotion capture or an `exd6` e.p. reads its square correctly; a recapture with check reads fine.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | the fixed sentence | the general rule is there ("a recapture can usually wait") but not WHY it waited here (check / bigger threat / the capture still there after) |
| CONSEQUENCE | no | — | what the reflex cost: the line after the recapture (errorWhy) |
| BETTER MOVE + JOB | partly | `bestSan` named | its job ("Rxd7+ comes with check, and the bishop on e2 is still there after") |
| HABIT | yes | "Before every recapture, ask whether something stronger comes first." | record gate (fixed string, no RED/GREY read) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KJ1 | recognize + knowledge (in-between move) | S | gate passes AND best is a check AND `inBetweenMove(fenBefore,bestPv,'best')` returns capture on `sq` | check → "a check"; sq | "A recapture can usually wait a move. Here a check came first, and the piece on {sq} was still there to take after." / "Taking back is not forced. When a check is on, play it first: the recapture waits." | "Taking straight back let them off the hook." | "{best} first, then take on {sq}." | "Before every recapture, ask whether something stronger comes first." | after move: lesson + consequence; better move named (past) | never when best is itself a capture on sq; never when the recapture is gone after best (then it is not "wait") | H + C (inBetweenMove) |
| KJ2 | consequence (now) | S | gate passes, best not a check, errorWhy has an `allowed` reason | errorWhy cause | "A recapture is not always the best move. Taking back here gave them {cause words}." | errorWhy line | "{best} came first." | KJ1 habit | same | needs errorWhy cause; silent otherwise | C |
| KJ3 | counterfactual / calculate | S | best captures elsewhere (`/x/` and square ≠ sq) | target square | "Two captures were on the board, and the bigger one came first: {best} wins more than taking back on {sq}." | "Taking back on {sq} left the bigger win." | "{best} took first." | "Count every capture on the board before you take back." | Learn: no move names before; after: named | best capture must win more (SEE) than the recapture | C (SEE) |
| KJ4 | their seat | O | same gates with mover = opponent | — | "They took back by reflex. When a capture is answered on autopilot, look for the move they skipped." | — | n/a (their better move: Review only) | — | Learn: say only when it hands the student a punish (combine with errorWhy) | today the computer is student-only (registry seat 'student'); O seat needs a seat param | C (seat param) |
| KJ5 | record | S | — | — | RED/GREY: full KJ1/KJ2 · AMBER: "A recapture can wait — {best} came first." · GREEN: silent | | | | | | H (record via correctionHabit habitNeed) |
| — | prevent, own plan, their plan, phase, endgame, strategize | — | n/a — a reflex recapture is a decision-order fault; no plan/phase fact exists in its inputs | | | | | | | | |
| — | exception | S | the recapture is the only move holding (onlyMove would say so) | — | never said — the reflex was right | | | | | onlyMove on the recapture | H |

## E. Mistake link
- Teaches: `costReason missed` where the missed line starts with a check/threat (motif `zwischenzug` from `detectTacticType`); `costReason allowed` after a recapture. Both seats only after KJ4's seat param; student seat today.
- Not a cause on its own: it is the HABIT for "missed in-between move". Join on the same turn as errorWhy.

## F. Build changes
1. `kneeJerk.ts:15` — return a typed `{ square, bestSan, bestKind: 'check'|'capture'|'threat'|'quiet', waits: boolean }` instead of a string; the sentence moves to `mistakeLesson` (KJ1–KJ3).
2. `kneeJerk.ts` — compute `waits` with `inBetweenMove(fenBefore, bestPv, 'best')` (needs `bestPv` param; the registry ctx has `bestUci`?); `bestKind` from chess.js on bestSan.
3. Add a REQUIRED `mover: 'student'|'opponent'` param; registry `boardComputers.ts:4844` passes it; drop the hard-coded `seat: 'student'`.
4. Habit wording becomes a `correctionHabit` habit id (`methodBeat.ts`) `recapture-first`, so the record decides (RED/GREY/AMBER/GREEN) instead of the once-a-game claim.
5. Delete the fixed string at :22 once the recipe table speaks it.

## G. Proof boards
- Fires (pure run, David's games): g:1002984876#21 `Nxe2` best `Rxd7+` loss 177, FEN `r2k3r/pppn1ppp/5n2/4N1B1/1b2P3/2N5/PPP1bPPP/2KR3R w - - 0 11` → KJ1 (check first; e2 bishop still takeable — verify with inBetweenMove at build). g:1020779996#63 `Rxg2` best `Qxg6` loss 217, FEN `2k3rr/1Np4p/P1b1p1q1/P3P3/3n4/2pP2Q1/5RnP/R1B3K1 w - - 0 32` → KJ3 (a bigger capture elsewhere: the queen on g6).
- Must not fire: any recapture with loss < 100 (e.g. every Review trade line in lines-0); a recapture that is the best move.
- Ran `kneeJerk` on all 12 games: 2 hits, both student, both ≥ 177 cp.

## H. Open questions
- Should Learn say KJ4 (their reflex recapture) at all, or only when it gives the student a punish?
