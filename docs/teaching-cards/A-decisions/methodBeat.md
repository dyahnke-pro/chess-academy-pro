# methodBeat — the habit that would have caught it (retrospective) + correctionHabit

## A. Identity
- `src/services/methodBeat.ts:139` `methodBeatRead(s: MethodSignals, ply)` (habits `MethodHabit = opponent-threat | forcing-scan | slow-down | candidates | what-it-guarded | blunder-check` :54); `correctionHabit(s)` :~505 (TOTAL: every correction closes on a habit, fixed words); `readHabit` :~490 (board reads). Called by `coachDecider.ts` (the one door) — no registry row. Census 18/18 (review).

## B. Facts
- B1: `{ habit, text }`.
- B2 dropped: the signal that earned it (`ignoredThreat`, the slip read's `howItFell`, `tier`, `cpLossCp`) — only the text survives; `slipHabit`'s `fall.kind` (threat/quiet/check/capture) is words only.
- B3 cheap: n/a — all inputs are already computed upstream; what is missing is TYPED output so the recipe table can place the habit LAST and gate it on the record.
- B4: student move only (:140); per-habit say-once (`saidHabits`); habits closed/fading on the record skipped (`habitIsOwed` :88); forcing scan cost ≥ 100, or ≥ 1 when the record is open (:96-97); slow-down needs tier only-move (either way) or critical with a slip (`SLIP_CP` 30 :104).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | | (methodBeat is not a lesson; it is the closer) |
| CONSEQUENCE | no | | |
| BETTER MOVE + JOB | no | | |
| HABIT | yes | `correctionHabit` text; record-aware (`habitNeed`) | the record states are open/fading/closed (lifecycle) — the card's RED/GREY/AMBER/GREEN are the hold-rate's; map them |

## D. Lesson recipes (HABIT slot supplier)
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MB1 | habit: opponent-threat | S | `ignoredThreat` | | | | | "Before your own idea, ask what THEY want — their threat comes first, every move." | last clause | habit owed | H |
| MB2 | habit: what-it-guarded | S | slip.guardLeft | | | | | "Before a piece moves, ask what it is guarding." | last | | H |
| MB3 | habit: blunder-check | S | slip lost a piece (left-to-take / threat / quiet / check / capture) | how it fell | | | | BLUNDER_CHECK_QUESTION + how it fell | last | `howItFell` 'later' → silent | H |
| MB4 | habit: forcing-scan | S | best forcing, cost ≥ bar | | | | | "Run CCT first: every check, every capture, every threat, then the quiet moves." | last | | H |
| MB5 | habit: slow-down | S | tier only-move/critical | | | | | "Positions where one move decides it are worth more time." | last | found-it stem only in Review | H |
| MB6 | habit: candidates (fallback) | S | none of the above, missed | | | | | CANDIDATES_HABIT | last | | H |
| MB7 | record mapping | S | | | RED/GREY: full habit · AMBER: the habit's first clause · GREEN: silent — map lifecycle open→RED, fading→AMBER, closed→GREEN, absent→GREY | | | | | | C (hold-rate read) |
| — | their seat | — | n/a — the method is taught to the player (:140); the opponent's mistake ends on the student's habit to PUNISH (blunderCheck BC4 / countMethod CM5), not on theirs | | | | | | | | |
| — | lesson/consequence/better | — | n/a — supplied by the cause's own computer | | | | | | | | |

## E. Mistake link
- The HABIT for every student MistakeCause (correctionHabit is total). Mapping: costReason allowed → MB3 (or MB1 when the threat stood before); missed forcing → MB4; whyItFailed abandoned-defender → MB2; sharp board → MB5; else MB6.

## F. Build changes
1. Return typed `{ habit, signal: 'ignored-threat'|'slip'|'forcing'|'tier'|'fallback', fall?: FallKind }` from `methodBeatRead`/`correctionHabit` (B2).
2. Recipe table's HABIT slot = `correctionHabit` (fixed words, never rotated — CLAUDE.md "the same habit phrase every time"); gate on the hold-rate record (MB7), replacing lifecycle `HabitNeed` at the call site or mapping it.
3. Fold the other family habits (kneeJerk "Before every recapture…", emptyCheckAt, keepPressing, countMethod) into `MethodHabit` ids so one vocabulary carries them.

## G. Proof boards
- Review lines (lines-*.jsonl, 18 said): "Blunder check before you let go of a piece … Here the answer was a capture: your knight on g5 was there to take." / "The move you wanted was a forcing one. Start with checks, captures and threats before anything quiet."
- Have-check misses: tales-from-a-grandmaster#4 "check what the opponent's last move threatens before replying" (MB1); turn-off-the-autopilot#1 "even when a move seems forced, look for a tactic" (needs habit `autopilot`, which `autopilotGuard` in safetyHabits.ts:85 has but methodBeat doesn't list).

## H. Open questions
- Map the hold-rate states onto the lifecycle `HabitStanding`, or replace `HabitNeed` with the hold rate everywhere? (Behaviour of AMBER on habits.)
