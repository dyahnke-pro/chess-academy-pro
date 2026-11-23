# Card — `gameArcSteps` (family F)

### A. Identity
- `gameArcSteps(sans, studentColor)` (generator) — `src/services/lookaheadPlan.ts:1782-~1830`, drained by `gameArcs` :1769; per move `planFromUci(fen, next 8 plies actually played)` (`HINDSIGHT_PLIES = 8` :1757) → `aimsOf` (planArc.ts:58: king-attack, shield, outpost, file, passer, route) → `stepArc` (planArc.ts:378) events emerge | advance | arrive | drop (:232).
- Consumer: Review only (`coachFeatureService.ts:2903-2907`, fact `plan-arc`). Census: 55 / 49 said (review).

### B. Facts
- **B1** `ArcEvent` {id, kind emerge|advance|arrive|drop, seat, squares, step, announces, text}.
- **B2 dropped**: advance events are computed and not spoken by design ("a chant", :1764); `drop` — WHY the plan dropped (the aim left `aimsNow`: the target moved, the file closed, the king plan died with the queens) is not carried; `kingPlanLive` gate (:394) reason.
- **B3 cheap**: the drop's cause — compare the aim on the board before the drop vs after (the aim's goal square now occupied/covered; the student's own move that killed it vs theirs). A drop caused by the STUDENT's own move with cost ≥ inaccuracy = "you gave up your plan".
- **B4 gates**: hindsight only (moves actually played); king plans need two queens and move > 10 (:392-399); a file plan only with the side's own pawn off the file (:404-411).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | emerge/arrive text ("There it is — your knight on d5. That was your plan") | general rule for a dropped plan |
| CONSEQUENCE | partly | — | drop cause |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GA1 | plan dropped by S's move | S | event drop on S's move, cause = S's move (B3), cost ≥ inaccuracy | aim phrase | "A plan only works if you keep playing it: the knight was on its way to d5, and that move took it off the road." | | engine best (the plan's next step) | "Before you change plans, ask what changed on the board." | Review (hindsight read needs the next 8 plies) — Learn n/a | drop caused by THEIR move | C (B3) |
| GA2 | their plan arrived | O | arrive event for O, and S had moves to stop it | | "Their plan arrived: the passer is on g2 now. The time to stop it was when it emerged." | | | | Review | | H |
| GA3 | knowledge — plan as itinerary | either | emerge→arrive | | (existing arrive line) "That was your plan: getting the knight to d5, by way of c3." | | | | Review | | H |
| GA4 | record | — | no-plan RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |
- Not applying to Learn: the read is hindsight (future moves) — Learn n/a by construction.

### E. Mistake link
- GA1: `no-plan` (Review). GA2: Review narrative, seat O.

### F. Build changes
1. Carry the drop's cause on the `drop` event (`by: 'own-move'|'their-move'|'board'`, and what changed).
2. Review recipe GA1 under `no-plan`; Learn untouched (hindsight).

### G. Proof boards
- Review census lines: "The plan for you here: getting the knight to d5 — on d5 it would be holding back their d-pawn." → "There it is — your knight on d5. That was your plan…" (emerge → arrive).

### H. Open questions
- none.
