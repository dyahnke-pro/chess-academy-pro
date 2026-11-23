# Card — `planThreadTurn` (family F)

### A. Identity
- `planThreadTurn(t, args)` — `src/services/planThread.ts:163-~330` (mutates `PlanThread t`; returns `PlanThreadLine[]`): the student's step credited (`planStepLine`), THEIR step (`deriveNextPlanFacts` for the enemy + `planStepLine`, past the opening), the stop (`planStoppedProof`, `planStoppedLine`, `stoppedInRow`), the new / changed plan (`planChangeSentence`), the method (`methodRead`/`methodPlanSentence`, said once a game), the why (`whyThisPlan`). Constants `PLAN_THREAD_HOLD_PLIES`, `KIND_RANK`, `THEIR_STEP_KINDS`.
- Adapter `boardComputers.ts:~3270-3292`, kind `plan-now`, surfaces: **learn: LEARN**, review (coachFeatureService), play ask; lesson/chat/think not; weaknesses `WEAK_PLAN_CHANCE`.
- Census: 62 / 54 said (review).

### B. Facts
- **B1** `PlanThreadLine` (:125-153): `kind`, `text`, `squares`, `claim`, `aim`, `proof` (the stop proven off their move), `arrows`, `seat`.
- **B2 dropped**: `stopProof` (the reason the plan stopped — what their move changed) is turned into a sentence; `stoppedInRow` (how many plans they've shut down in a row) only colours the wording; `top` vs `standing` plan kinds and ranks (`KIND_RANK`) — why a plan was replaced — dropped.
- **B3 cheap**: THE MISSED ANSWER — when THEIR move is a step of their plan (`theirStep`, e.g. one more piece on your weak pawn: "they hit it twice, you guard it twice"), check the student's next move: did it add a guard / move the target / counter? If not and it cost ≥ inaccuracy → the student ignored their plan step. And the student's move that let THEIR plan start (their top plan appears after the student's move).
- **B4 gates**: past the opening (`classifyPhase`) for their step and for the plan; not in check; a plan stands until a stronger kind appears (`KIND_RANK`); a change waits `PLAN_THREAD_HOLD_PLIES` (no wobble); the method only when the plan is not passer/convert; `holdPlayable` (Learn holds a step that is a legal move now).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | the step lines carry the count ("they hit it twice, you guard it twice") | the general rule wording of each plan kind |
| CONSEQUENCE | yes | stop line / their step count | — |
| BETTER MOVE + JOB | no | — | the move that answered their step (engine best after their step) |
| HABIT | yes (method, once) | `methodRead` ("checks, captures, threats … weakness, worst piece, break") | tie to the record |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PT1 | prevent — their siege step not answered | O step, S's reply the mistake | their last move was a `theirStep` (siege/pile-on); S's move did not change the count on the target; S cost ≥ inaccuracy | target, hits/guards | "Count every time they add an attacker: c3 is hit twice now and guarded once — it needs a guard or it falls." / "When they pile on a pawn, answer each new attacker with a new defender." | "c3 falls next move." | "Qd2 added the second guard." (engine best) | "After each of their moves, ask what it added to." | after | S's move did add a guard | C (B3) |
| PT2 | plan stopped by S's own move | S | the student's move ended their own stated plan (stop proven, but S moved) — rare; OR the plan changed kind on S's move | | "Don't abandon a working plan for a one-move idea." | | engine best (the plan's next step) | | after | — | C |
| PT3 | the method (habit) | S | S's mistake is `no-plan`, method read exists, record RED/GREY | | (HABIT stem) "How do you find a plan? First checks, captures, threats. Then: where is their weakness, which of your pieces is worst, where is your pawn break?" | | | | as the HABIT slot after a `no-plan` mistake | record AMBER/GREEN | H |
| PT4 | credit (good) | S | step credited | | (existing) "Your rook to e8 was a step of the plan…" | | | | Review only (not a mistake) | | H |
| PT5 | record | — | `no-plan` RED/GREY full + method; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- PT1: costReason `allowed` when the target then falls (material); before it falls, no cause exists — the "unanswered pile-on" is a new positional cause candidate (`ignored-pressure`). Seat: their step O, the mistake S.
- PT3: HABIT slot for `no-plan`.

### F. Build changes
1. Expose `theirStep` as a typed field `{ target, hits, guards, plan.id }` on the line (today only text).
2. New `answeredStep(theirStep, fenBefore, san)` — did the student's reply change hits/guards on the target. Enables PT1.
3. Under this WO Learn speaks the thread only after a mistake (PT1, PT3); credits (PT4) and announcements move to Review.
4. `mistakeLesson`: new cause `ignored-pressure` → PT1; `no-plan` HABIT slot → PT3 method.

### G. Proof boards
- Review lines (census): "Their rook to c8 was a step of their plan: one more piece on your weak pawn on c3 — they hit it once, you guard it once." (PT1's precondition); the full method line ("How do you find a plan? …").
- Guard: opening phase; student in check.

### H. Open questions
1. A new cause `ignored-pressure` — or wait until the pawn falls and let costReason say it?
