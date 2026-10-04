# Learn how to think — the coach's lesson plan (PLAN, 2026-10-04)

Status: **PLAN, awaiting David's go.** Nothing built yet.

## The ask (David, 2026-10-04)

- Inside **Learn**: any NON-SPECIFIC "teach me" starts a **lesson plan from the
  coach**. Not a line, not a fact: a lesson in **how to think and how to see**.
- The coach **sets up positions** and **teaches the skill**, so the student can do
  it alone in their own games. Not "the targets are X"; teach HOW to find targets.
- **Every answer is a tap on the board.** Several answers mean several taps. A
  partial answer followed by a pause gets "Good — one more."
- **Positions: the student's own games first**, real puzzles as the fallback.
- **Every visit is different.** It remembers what was done, the progress, and the
  weaknesses shown.
- May grow into its own Learn tab, **"Learn how to think"**, once it is strong
  enough.

## Why it matters (Foundation)

This is the coach teaching the PROCESS that every other computer feeds. Each step
below is a computer the app already owns (exchange counting, the board delta, the
tactic detector, forcing candidates, weak squares). That makes the lesson
**dual-use**: the computer that grades "tap every loose piece" is the one that
later says in Review "the knight on c6 was loose for three moves." Lesson answers
feed the heat map, so the coach learns whether you can SEE, not only whether you
solved a puzzle.

## Sources that shape it

- **Steps Method** (Brunia & van Wijgerden): read the board for targets first, then
  act; difficulty in clear steps; themed exercises, then mixed, then games.
- **Nunn, "Loose Pieces Drop Off"**: Locate loose pieces on both sides → Force
  (checks, captures, threats) → Combine → Verify.
- **Heisman, "Is it safe?"**: safety first. Before any move, list the opponent's
  checks, captures and threats. Skipping that is "hope chess."
- **Aagaard's three questions**: weaknesses, the worst-placed piece, the
  opponent's idea.
- **Worked-example effect**: novices learn faster by watching the steps, then having
  the support faded. Hence Show → Guide → Solo.

## The method: seven steps, a fixed order (the habit IS the order)

| # | Step | What it teaches you to look for | Tap questions (examples) | Computer (exists) |
|---|---|---|---|---|
| 1 | **What did their move change?** | new attacks (incl. discovered); what it STOPPED guarding; lines opened or closed; what it threatens next (check, capture, mate, fork square); what it prepares | "Tap what it attacks now" · "Tap what it stopped guarding" · "Tap the square it's aiming at" | `computeBoardDelta` (boardDelta.ts:65), `moveIntent` / `nullMoveFen` (moveIntent.ts:90/124), `opponentIntentRead` (positionReadingService:1464) |
| 2 | **Am I safe?** | my loose and under-defended pieces; pins on me; overloaded defenders; their checks; my back rank | "Tap every piece of yours that would be lost" · "Tap every square they can check from" | `findHangingBySee` (312), `detectTactics` pins/overload (tacticsDetector:238/716), `detectLatentDanger`, `kingSafetyRead` (1678) |
| 3 | **Where are their targets?** | loose and under-defended pieces; pieces guarded only by a pinned or overloaded defender; valuable pieces on one line; trappable pieces; an exposed king | "Tap every loose piece of theirs" · "Tap the defender doing two jobs" | `findHangingBySee`, `findAttackTargets` (1617), `pressuredTargets` (1230), `findXrays` (769) |
| 4 | **My forcing moves** | every check, every capture (which WIN), every move that threatens | "Tap each square you can check from" · "Tap every capture that wins material" | `findForcingCandidates` (2039), `capturesWinMaterial` (214) |
| 5 | **Hit two at once** | squares where one piece hits two targets; a line through two; the defender to remove | "Tap the square that hits both" | `detectTactics`, `forkPoints` / `lineTacticPoints` (factStakes) |
| 6 | **No tactic? The plan** | the weakest pawn or square; my worst piece; the break; their long-term idea | "Tap their weakest square" · "Tap your worst piece" | `findWeakSquares` (572), `findWeakPawns` (1127), `strongestWeakestPiece` (1091), `findPawnBreaks` |
| 7 | **Is my move safe?** | after my move: their checks, captures and threats | "Tap the reply that would hurt" | the same step-2 computers, run on the position after the move |

**Ranking (confirmed in code: no second ranker).** INSIDE each step, items are
ranked by the one door, `coachDecider.decide` (coachDecider.ts:290) → `factValue`
(reviewFacetRank.ts:339) = `stakeValue` (material × 0.8^plies-until-it-lands,
factStakes.ts:53) or `TIE_ORDER`, plus the student's own hole (raise-only). The
ORDER of the seven steps stays fixed: it is the habit being taught. One exception:
a step that is critical in this position (their move threatens mate) takes the
lesson there (importance gates, as in live play). A sub-question whose items are
all below the floor is not asked in that position.

## One lesson

1. **Show** (worked example): on a clear position, the coach runs the step aloud
   and lights the squares as it names them. "Count the defenders. The knight on c6
   has one defender and two attackers: it's loose."
2. **Guide:** a new position; the coach asks; the student taps.
   - A right tap lights green and stays.
   - A wrong tap: the coach names the method step that rules it out, never the
     answer ("that bishop has two defenders: count them").
   - A partial answer, then ~8 s of silence: "Good — one more." Silence again: the
     coach shows the rest and explains each.
3. **Solo:** a fresh position, no prompts; graded against the computed key.
4. **Carry-over:** the next time this skill comes up in the student's own Learn
   game or Review, the coach asks the same tap question at that moment.

Voice: computed facts phrased through `voiceFacts` (G0); stems ROTATED, never
`Math.random`; you/they; no praise beyond "good" on a partial (the machine
celebrates via the reward layer).

## A fair answer key (the core engineering decision)

A tap answer is only fair when the answer set is crisp. A position is used for a
sub-question ONLY when:

- every key item clears the stake floor, AND
- no near-miss sits just under it (no square the student could reasonably call
  right that the key calls wrong), AND
- the set is small enough to tap (1–4).

The SAME computer filters positions and grades answers, so difficulty is a
property of the position (how many items, how noisy the board), and it climbs in
Steps-Method fashion: Step-1 = one loose piece on a quiet board; later = several
targets in a busy middlegame.

## Positions

1. **The student's own games** (`db.games` annotations, `db.mistakePuzzles`;
   pickers `findMistakePositions` / `samplePositionsFromGame`,
   positionReadingService:~1891/~1839). Their own blunders teach best.
2. **Real puzzles** (`puzzles.json`, the long and master pools) as the fallback,
   and for every new user.

Never invented (G3). Every position passes the fair-key filter above.

## Memory: every visit is different

- **Per sub-skill record** through the existing writer `recordLaneEvidence`
  (capabilityEvidence.ts:397) with explicit tags (held / broken, `prompted` when
  helped). Every tap counts.
- **New tags**, one per sub-skill (e.g. `reads-move-change`,
  `spots-own-loose`, `spots-their-targets`, `lists-forcing-moves`,
  `spots-double-hit`, `reads-weaknesses`, `blunder-checks`) in `MISCONCEPTION_TAGS`
  (misconceptionTags.ts:45), answered in `TAG_LAYER` and `COACH_TAG_HABIT` (the
  type system forces it), so they appear on the heat map automatically.
- **Seen positions** are stored per student and never repeated.
- **Choosing the next lesson** is from the record:
  red → re-teach; grey → teach fresh; green → an occasional review to keep it
  green. A new student starts at step 1.
- **Opening line** picks up from last time: "Last time you missed what their moves
  stopped guarding. Let's start there."
- Note: `recordLaneEvidence` does not call `emitWeaknessModelChanged`; the lesson
  must, so the heat map and the mid-game green tile update live.

## It is ALGO-BASED and tied to everything the app knows (David: "It algo to the user, it's tied to weaknesses, all the things!")

Nothing about which lesson, which step, which position or how much help is
hand-picked. Every choice is computed from the student's own record, through the
joins that already exist (never a second, coarser join; CLAUDE.md "EVERYTHING IS
ALGO-BASED"):

| Signal (exists) | What it decides in the lesson |
|---|---|
| **Weakness spine** (`weaknessSpine.getUnifiedWeaknessProfile`: game misconceptions, mistake puzzles, classified tactics, opening weak spots) | WHICH step leads. "hung material" red → step 2 (am I safe?); "missed tactic: fork" red → step 5; "ignored threat" → step 1. One mapping, each tag → its step, held as a `Record<MisconceptionTagId, ThinkingStep \| null>`, so a new tag fails to compile until someone answers it. |
| **Their own positions behind that weakness** (the spine's `positions`, `mistakePuzzles` with `sourceGameId`) | WHICH position: the lesson is taught on the exact boards where they went wrong, whenever one passes the fair-key filter. "This is your game against X, move 14." |
| **Heat map / capability evidence** (red / grey / green, `capabilityProven`) | HOW to teach: red → Show + Guide again; grey → Show first, from scratch; green → straight to Solo, or skipped. Lesson taps are evidence on the same bar. |
| **Fundamentals record** (`misconceptionTags` per pillar) | The plan step (6): a student who keeps leaving pieces passive gets "tap your worst piece" first. |
| **Puzzle and tactic misses** (`puzzleMiss`, `logPuzzleMisconception`) | Feeds the same spine. A miss in Tactics today can be tomorrow's lesson. |
| **Need score** (`computeNeed`, through `coachDecider`) | Ranks items inside a step, with the student's hole as a raise-only boost. |
| **Up next ranker** (`upNextPicker` / `buildTodaysReps`) | A thinking lesson is a bite like any other: when the record says "learn to see loose pieces" is the most important thing today, Up next offers it (and Home can blink it). |
| **Reward layer** (`rewardService`, `learnReward`) | A skill turning green fires the same green tile as everywhere else. |
| **Rating** | Never decides how much the coach says (grey teaches in full). Only position difficulty at cold start, and it fades as the record grows. |

Cold start (no record): everything is grey, so it teaches the steps in order from
step 1, on real puzzles. Every lesson writes back, so the second visit is already
chosen by data.

## Wiring (from the code map)

- **Routing.** A new branch in `CoachTeachPage.handleSubmit` AFTER the
  training-aid block (4263, so "teach me tactics" keeps drilling) and the
  middlegame-plan block (ends 4473), BEFORE `TEACH_PATTERN` (4485). A tight
  whole-message pattern: "teach me", "teach me something", "teach me chess",
  "teach me (how) to think". Must NOT catch "teach me something else / new"
  (walkthrough control), "what should I learn next?" (tested recommendation route),
  "teach me tactics", "teach me my weaknesses", or any opening name. Today these
  phrases fall into `TEACH_PATTERN` and reach a bogus opening picker or the brain.
  This fixes that bug too.
- **Tap input.** Learn has no square-answer mode today. Add a lesson branch that
  swaps in the STATIC board (as `reviewFen` / `lineWalkFen` already do, ~12200)
  with `onSquareClick` + `squareStyles`. Template: `AnalysisPracticePage`
  (onSquareClick 331, styles 434-436).
- **Lesson state.** Its own ref, modelled on `activeDrillRef` (1370) /
  `loadDrillOntoBoard` (2418).
- **Logic out of the 15k-line page.** A pure `thinkingLesson.ts` (pick position →
  build sub-question + key → grade a tap set → next step) and a hook
  `useThinkingLesson`. CoachTeachPage only routes and renders.
- **Audit (algo rule).** One emission per decision (`thinking-lesson-step`: step,
  sub-question, key size, taps, outcome, source) through the one door, a contract
  row in `algoAuditContract.test.ts`, and a prod audit
  (`audit-learn-how-to-think-prod.mjs`) that plays a lesson by tapping.

## Phases

1. **P1: one step end to end (step 3, targets).** Route, tap board, fair key from
   `findHangingBySee`, Show/Guide/Solo, nudge, record + heat map, memory of seen
   positions, own-games-then-puzzles. Hand walk on prod.
2. **P2: steps 2 and 1** (safety, what their move changed).
3. **P3: steps 4–5** (forcing moves, hit two at once).
4. **P4: steps 6–7** (plans, is my move safe) + carry-over into Learn games and
   Review.
5. **P5: its own tab** "Learn how to think", if David judges it strong enough.

## Open questions for David

1. The ~8 s "one more" pause: right length?
2. Should Show be skipped for a student whose record is already green on that
   step (straight to Solo)?
3. P1 first step: targets (my pick, the most teachable on a quiet board), or what
   their move changed?
