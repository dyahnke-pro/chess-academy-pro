# liveMethodBeat — the habit to run now, on the live board

## A. Identity
- `src/services/methodBeat.ts:352` `liveMethodBeat(s: LiveMethodSignals, ply, said)`; habits `LiveHabit = opponent-threat | forcing-scan | loose-trigger | candidates | look-again | calc-now | mark-line` (:330); key `liveHabitKey` (:337).
- Registry `liveMethod` `boardComputers.ts:3143-3156`, kind `method` (`HABIT_KIND` :103: opp-think / forcing-scan / method), LIVE_READ, student seat, once a game per habit. Census 255/212 (chat 112+60, learn 40; 43 held beside-mate).

## B. Facts
- B1: `{ text, key, habit, proof?, squares }` (:333).
- B2 dropped: which signal earned the habit is in `habit`, but the signal's own data (threatTarget, looseTarget, defenceFails.proof, sacrificeLine.mark) is used for words only; `tier` not returned.
- B3 cheap: the RETROSPECTIVE pairing — keep the pre-move signals of the board, and on the student's mistake check which habit's signal was present and missed: threat standing + student ignored it; forcing best + student played quiet; loose target + student missed it. That is exactly `methodBeatRead`'s job (methodBeat card) — the live signals are the evidence it lacks.
- B4: student to move (:353); per habit say-once; `isDecidingMoment(tier)` for forcing/loose/mark-line/calc/candidates; threat habit needs a target (:376) and no mate on the board (:373).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Their threat first, your idea second: right now they're after your rook on d6." | pre-move only — banned in the new Learn |
| CONSEQUENCE | no | | |
| BETTER MOVE + JOB | no | (never names the move — correct pre-move) | |
| HABIT | yes | the habit sentences | in the new Learn they move to the HABIT slot after a mistake |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LM1 | habit (their threat) | S | pre-move signal threatStanding+target; student's move a mistake that ignored it (errorWhy cause the threatened piece) | target | — (the cause's own lesson leads) | | | "Their threat first, your idea second." (fixed, record-gated) | after move, HABIT slot | habit owed (RED/GREY) | H (signals) |
| LM2 | habit (forcing scan) | S | pre-move best forcing, deciding tier; student played quiet, mistake | | | | | "Run CCT first: checks, captures, threats." | HABIT slot | | H |
| LM3 | habit (loose trigger) | S | looseTarget pre-move; student missed it | target | | | | "A loose piece is where tactics start." | HABIT slot | | H |
| LM4 | habit (look again) | S | defenceFails pre-move; student played the plain defence | target, proof | "The natural defence fails here: {proof}." | | best | "Check the answer before you play it." | HABIT + lesson | proof required | H |
| LM5 | habit (mark the line) | S | sacrificeLine; student sacrificed into a speculative line and it failed | mark | "A sacrifice where they have real choices is a gamble: mark it before you play it." | | | "Mark the line forced or speculative before you give material." | | | H |
| LM6 | pre-move voice | S | today | | n/a in the new Learn (spoken before the move); chat/Review/lesson keep it | | | | delete from Learn | | — |
| LM7 | record | S | | | RED/GREY full habit · AMBER short · GREEN silent | | | | | | H |
| — | their seat | — | n/a — a habit is taught to the person playing (:353) | | | | | | | | |

## E. Mistake link
- Supplies the HABIT for: costReason `allowed` with the threat standing before (LM1, principle `ignored-threat`), costReason `missed` forcing (LM2, `passive-when-forcing-existed`), loose piece missed (LM3), `whyItFailed answered-by-tactic` on a defence (LM4).

## F. Build changes
1. Learn: delete the pre-move `liveMethod` read (new Learn speaks only after the move).
2. Persist the pre-move `LiveMethodSignals` of each board in the turn state so the post-move mistake turn can pass them to `methodBeatRead`/`correctionHabit` (one habit vocabulary `HabitId`).
3. The habit texts become `correctionHabit` outputs (fixed words, record-gated) — no second wording.

## G. Proof boards
- Danya vc-_X7t6o3o6JM-54 ("Run the question now — what are they threatening? They're after your rook on d6.") — LM1's habit with its answer; vc-_WmByfLW-3g-34 (forcing scan).
- Have-check misses: blunders-a-grandmasters-perspective#2 "run a DAP check (double attacks, pins) and look for in-between moves"; how-to-avoid-blunders-part-1#2 "main-line check".
- Not run on David's games (signals are built by the live composer, not a pure board call).

## H. Open questions
- Is the pre-move habit line removed from chat too, or only from Learn's spoken turn?
