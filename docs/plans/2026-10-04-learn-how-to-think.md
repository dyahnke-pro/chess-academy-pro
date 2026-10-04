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

## The method, STRENGTHENED (2026-10-04, second pass): ten steps

The seven steps below were strong on SEEING and missing four parts of thinking:
assessment first, answering danger, comparing candidates (Kotov), calculating to
the end. The full order:

| # | Step | New | Computer (exists) |
|---|---|---|---|
| 1 | **Assess** — who's better, material, king safety → the MODE (attack / defend / improve) | ✓ | material + `kingSafetyRead` + engine eval; the plan thread's tactical↔positional switch (WO-COACH-TEACHER WO-2) |
| 2 | What did their move change? | | (step 1 below) |
| 3 | Am I safe? | | (step 2 below) |
| 4 | **Answer the danger** — move it, defend it, block, or counter with something bigger | ✓ | the threat→answer computer (Naroditsky census), `threatAnswer` |
| 5 | Their targets | | (step 3 below) |
| 6 | My forcing moves | | (step 4 below) |
| 7 | Hit two at once | | (step 5 below) |
| 8 | **Candidates** — find 2–3, compare | ✓ | `deliberation` (candidate weighing), `tacticalRead` tempting pick |
| 9 | **Calculate to the end** — where the line stops, who is ahead then | ✓ | `proofCut` (what a line wins), `computePvLine` |
| 10 | Is my move safe? (blunder check) | | (step 7 below) |

The old step 6 (no tactic? the plan) lives inside ASSESS: it is where step 1 sends
a student when the mode is "improve".

**It grows with the student (Steps-Method progression).** Ten steps swamp a
beginner. Beginners learn the four that stop most lost games: what changed → am I
safe → their targets → is my move safe. The rest unlock as those turn green on
the heat map. The ORDER never changes; the student sees more of it as they prove
each part.

### Unlocking — the tiers and the rules

The ten steps never change order. What grows is how many of them the lesson plan
SERVES. A tier unlocks by PROOF on the student's own record, never by rating
(Foundation: the rating decides strength, never how much the coach teaches).

| Tier | Steps it adds | Why these first |
|---|---|---|
| **1 · See the board** | 2 what their move changed · 3 am I safe · 5 their targets · 10 is my move safe | The four habits that stop most lost games: blunders against you, and gifts you miss. |
| **2 · Force it** | 4 answer the danger · 6 my forcing moves | Once you see, act: meet threats, list checks / captures / threats. |
| **3 · Combine and calculate** | 7 hit two at once · 9 calculate to the end | Turning targets into a won line and checking where it stops. |
| **4 · Think like a player** | 1 assess (and the plan, when the mode is "improve") · 8 candidates (obvious vs killer) | Choosing between good moves and knowing what kind of position it is. |

**The rules:**
1. **Unlock = every step of the current tier PROVEN.** Proven uses the ONE bar the
   heat map already uses (`capabilityProven`: unprompted holds at real
   importance), counted on the step's existing tags. No second bar.
2. **Placement on the first visit.** A short Solo check, one position per tier-1
   step. Steps the student solves cleanly are proven on the spot, so a strong
   player clears tier 1 in minutes and is never held back. No record ≠ beginner:
   grey teaches, but it does not lock out a player who shows they can.
3. **Lessons serve the lowest unproven step first,** within the unlocked tiers,
   led by the weakness spine (a red step from their games jumps the queue).
4. **Proven steps come back as review** (spaced, rare) so they stay green.
5. **Re-lock by evidence.** A proven step that goes red in the student's games
   (curriculum demotion mastered → queued, `weaknessLifecycle` worsening) returns
   to the front, escalated. Higher tiers stay open; the coach goes back to fix it.
6. **Nothing is ever hidden on request.** A student who asks for a locked step
   ("teach me to calculate") gets that lesson; tiers order the PLAN, they do not
   gate the coach. The live coach and review use all ten steps whenever the board
   calls for one.
7. **Beginner mode** (`isBeginnerMode`) only picks quieter positions in tier 1. It
   never shortens the plan or the teaching.
8. **The unlock is a reward moment:** a tier opening fires the reward layer and
   the coach names what is next ("You see the board. Now: forcing moves.").
   Emitted as `thinking-tier-unlocked` with the proof that opened it (algo audit rule).

**Answered (David 2026-10-04):** the "one more" pause is ~8 s; P1 builds step 5
(their targets) first. **Green steps are touched briefly, not skipped:** the coach
says so from the record ("Your skill chart shows these green, so we'll review them
briefly and move on if you show you've got them"), serves ONE Solo position per
green step, and moves on if it is solved clean. A miss drops that step back to the
full Show → Guide → Solo and counts as evidence on the heat map like any other.

**Step 8 position rule — an obvious good move AND a subtler, better one (David).**
A position is used for Candidates only when BOTH exist:
- *Obvious good move:* forcing (check / capture) or the natural move, and genuinely
  good (keeps or wins an edge; never a blunder).
- *Subtle better move:* the engine best, clearly stronger than the obvious one
  (mate where the obvious move isn't, or a large eval gap), ideally quiet or not
  the first forcing move a student reaches for.

The student taps a move (from-square, then to-square). On the obvious one: "Good —
that wins a pawn. Before you play it: is there something stronger? What does it
leave on the table?" Then they compare. Either way both lines play out with their
proof. Extends `tacticalRead`'s "tempting but wrong" pick to "tempting but
weaker"; the puzzle DB's `quietMove` theme is a fallback source.

## The seven seeing steps in detail (numbering of the first pass)


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

## 🔒 REAL DIALOGUE — the coach ASKS and ANSWERS (David 2026-10-04: "This is a platform for q and a" … "THE COACH NEEDS TO BE ABLE TO ANSWER THEIR QUESTIONS!!")

**A. The coach answers every question — a hard requirement, not a feature.**
- Mid-lesson, the student can ask anything; the lesson pauses (Learn already
  auto-pauses on chat), the coach answers, the lesson resumes.
- Questions about the LESSON POSITION are answered from the lesson's own computed
  facts (the answer key + the method facts behind it): "why is that a target?" →
  the attackers vs defenders it was graded on; "what about my bishop?" → that
  piece's safety and scope; "how many defenders?" → the count; "why not Nxe5?" →
  the engine read + proof line; "what should I play?" → the step's best move with
  its reason. Wider questions go through the full grounded chat pipeline
  (`groundedAnswer` lanes / the ONE-CHAT parser when it lands).
- **Never a refusal, never a stock "I can't verify that" inside a lesson.** If a
  computer has no answer, the coach says what it CAN see on that board.
- **Gate:** a lesson question matrix (like `audit-coach-all-questions-prod`),
  driven by typing AND by voice, fails on any unanswered, off-topic or
  board-false reply.

**A2. THE ROUTE OF EVERY QUESTION — the ONE-CHAT parser (approved by David 2026-09-29; confirmed for lessons 2026-10-04).**
Phrasing varies endlessly, so the LLM READS the question and code ANSWERS it
(`docs/plans/2026-09-29-ONE-CHAT.md`):
- typed or spoken (mic transcript), every lesson question goes through the parser:
  the LLM (`callDeepseekWithTool`, forced structured output) fills a CLOSED,
  validated schema — the question kind, the referent (piece / square / move,
  "what I played", "the other knight"), the seat — and never decides chess;
- validation checks the referents against the board (the piece is there, the move
  is legal); a reading that fails is not answered from guesswork: the coach asks a
  one-line clarifying question;
- the answer is computed by the lesson's own computers (A), then phrased through
  `voiceFacts`;
- lesson question kinds are ADDED to the ChatTurn schema, not a second parser:
  why-is-it-a-target, count-attackers / defenders, what-about-<piece>,
  compare-my-move (what I played vs the better move), what-did-their-move-change,
  is-<piece>-loose, what-should-I-play, I-don't-know;
- the fast regex path runs alongside (no added latency on a hit); shadow first,
  switched on measured accuracy (≥95% on real questions + held-out phrasings).
Status 2026-10-04: ONE-CHAT is approved and NOT built — only the translation seam
uses the LLM today; questions route through ~55 regex detectors. The 2026-10-04
walk shows the cost: "why is that move better than what I played?" matched the
best-move regex and dropped "what I played". **The lesson build therefore builds
the parser's lesson slice first** (or lands on ONE-CHAT if it ships first).

**B. The microphone works — real spoken dialogue.**
- Learn's chat input already has a mic (`voiceInputService` via `ChatInput`:
  continuous listening, live transcript, barge-in that cuts the coach off). Verify
  it end to end in a lesson, then extend it:
  - a spoken QUESTION goes through A;
  - a spoken ANSWER counts like taps: "the knight on c6", "c6 and e5", "the rook"
    (when there is one) → squares, through one deterministic parser (no model
    decides the square);
  - the coach replies by voice and the lesson carries on.
- Verified headless with an injected transcript; the real-device mic (iPhone
  app, AVAudioSession patch) is flagged to David.

**C. The coach's questions check understanding, not luck.**
1. **Follow-up chains:** a right tap is followed by a question only an
   understanding answers: "Good — the knight on c6. Tap every piece of yours
   attacking it." → "Now tap its defenders." → "So who wins it?" The counting
   method becomes visible, all by taps.
2. **Ask before telling** (testing effect): red and green steps ask first and
   teach only on a miss; grey steps keep Show first.
3. **"I don't know"** is a button (and a phrase): honest data, counted as prompted,
   then the coach shows the step.
4. **Wrong taps diagnose the misconception.** WHICH wrong square says why: a
   defended piece → doesn't count defenders; a pawn-guarded piece → ignores who
   defends; their piece when asked about yours → skips own safety. Each pattern
   maps to an existing tag and is recorded, so lessons feed the spine like game
   mistakes do.
5. **Guess-proofing:** extra taps count as wrong; the number of answers is told
   only after the first try; a set number of misses moves on to Show.

**C2. The lesson-answer record — the highest-trust data in the app (David 2026-10-04: "Absolutely collect this data. Its value and accuracy will be highest of all data collected.")**

Every answer is stored, because a lesson answer is the most CONTROLLED evidence
the app gets: the position, the question and the key are all known, so a wrong tap
names the misconception directly (game slips are inferred from a move).

Per question, one row (Dexie, through the existing writers where they fit):
- step, sub-question, position source (own game id + ply / puzzle id), the key
  set, every tap IN ORDER with right/wrong, extra taps, time to first tap and
  between taps, help used (Show / "I don't know" / nudge / hint), spoken vs
  tapped, the follow-up chain reached, and the misconception each wrong tap maps
  to;
- written as capability evidence (`origin: 'lesson'`, held/broken, `prompted`
  when helped) on the existing tags, and wrong-tap misconceptions written to the
  spine like game slips.

**Lessons measure KNOW, games measure USE.** Both feed the same record; neither
replaces the other. The GAP between them is the signal the coach acts on:
"finds loose pieces in lessons, still hangs them in games" = the idea is known,
the habit has not transferred → drill the habit in live Learn play (the step
question asked at the real moment), not another lesson on the idea. The heat map
can show both (known / used) once the data exists.

**D. Making it stick.**
6. **Mixed practice** once a tier is proven (the Steps Method's "mix" books): the
   student first decides WHICH step applies, as real games demand.
7. **Transfer is the real score.** A skill is learned when the same mistake drops
   in their own games, not only when lesson taps are right. Measure lesson skill
   against that tag's game frequency before and after.
8. **Session shape:** ~5–8 minutes; closes with what was proven, what is next, and
   earned praise; resumes where it stopped.
9. **Praise is allowed in lessons (David: "We need some praise")** — earned only (a
   clean solve, a step turning green, a tier unlocking), never on every tap, stems
   rotated so it keeps meaning something. "Let's drill it" and "Solved — nice"
   stay as they are.

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
- **NO new tags: the existing vocabulary.** Each step trains the SAME misconception
  tags the game analysis already files slips under, so a lesson and a diagnosis
  are one fact (dual-use; inventing parallel tags would reopen the
  `discovery` vs `discovered_attack` rot). The map, held as a
  `Record<ThinkingStep, readonly MisconceptionTagId[]>`:

  | Step | Existing tags it trains |
  |---|---|
  | 1 what their move changed | `missed-opponents-threat` |
  | 2 am I safe | `hung-material`, `missed-opponents-threat`, `weakened-king-safety` |
  | 3 their targets | `missed-tactic`, `greedy-pawn-grab` (a "target" that isn't one) |
  | 4 forcing moves | `missed-tactic` |
  | 5 hit two at once | `missed-tactic` (the motif via `tacticVocabulary`) |
  | 6 the plan | `no-plan`, `misplaced-piece`, `created-pawn-weakness`, `mistimed-pawn-break`, `neglected-development` |
  | 7 is my move safe | `hung-material`, `missed-opponents-threat` |

  A new tag is added ONLY if a sub-skill has no home here, and then once, in
  `MISCONCEPTION_TAGS`, answered in `TAG_LAYER` / `COACH_TAG_HABIT`.
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

## How it ties into everything already built

🔴 **CORRECTED 2026-10-04.** An earlier version of this section said this plan
"is" unified-coach Phase 5. Phase 5 was BUILT on 2026-09-08 as the **custom
lesson** (`customLessonPlan.ts` + `CoachTeachPage.startCustomLesson`): the Learn
opener names the student's top holes as chips; "build me a lesson" / "teach me my
weaknesses" also start it; each ~3-part lesson TEACHES the idea (corpus prose)
then DRILLS the student's own flubbed positions by move, and syncs the curriculum.

**This plan EXTENDS that lesson; it does not build a second lesson system:**
- the part's "teach the idea" becomes the METHOD lesson (Show → Guide → Solo, tap
  answers, the ten steps);
- "drill your own positions" stays, as Solo + carry-over;
- a bare "teach me" joins `matchCustomLessonRequest` (today it falls into
  `TEACH_PATTERN` and the opening picker), and the opener gains a "Learn how to
  think" chip;
- lesson parts are still chosen by the same spine + curriculum, now arranged by
  step and tier.
Before building: play the existing custom lesson on prod to see what works today.

Every piece below exists; the lesson consumes it.

| System (exists) | Tie |
|---|---|
| **Question engine** — `positionReadingService.buildReadingQuestions` (20 types, each with `answerSquares`, `misconceptionTag`, `demoLine`, `readingHint`) + `positionReadingGrader.gradeReadingAnswer` | The lesson's tap questions ARE reading questions. Extend this engine (multi-square answer sets, the step-1 "what changed" and step-7 "is it safe" types), never a second question builder. Analysis Practice and the lesson then share one engine. |
| **Curriculum + memory** — `coachCurriculumService` (`buildCurriculum`, `reconcileCurriculum`, `nextCurriculumItem`, mastered→queued demotion when a hole recurs) + `weaknessLifecycle` (persistent / worsening) | The lesson PLAN is the curriculum. "Every visit different, remembers progress" is this record plus capability evidence. A step marked mastered that recurs in a game comes back escalated (unified-coach P6). No new ledger. |
| **Weakness spine** — `getUnifiedWeaknessProfile` (with `positions` from the student's games) | Picks the leading step and the boards it is taught on. |
| **Capability evidence + heat map** — `recordLaneEvidence`, `capabilityProven`, `heatMap` | Every tap is held/broken evidence on the existing tags; the heat map shows lesson progress with no new tile. |
| **Fundamentals** — the 33 named fundamentals, `/coach/fundamentals` | Step 6 teaches the pillars a student keeps breaking; a fundamental going green is the same event in both places. |
| **The one door** — `coachDecider.decide`, `factStakes`, need score | Ranks items within each step; the importance gate lets a critical step take the lesson. |
| **methodBeat** (the habit line in live play) | The live coach names the lesson STEP: "Before you move: what did their last move change?" Live play and lessons teach the same seven-step habit in the same words. |
| **Learn free play** — the turn door (`composeLearnTurn` / one decision) | Carry-over: when the student's own game hits a lesson skill at a real moment, the coach asks the same tap question there (Learn only, never Play — Play volunteers nothing). |
| **Review** — find-the-shot and turning-point cards | Carry-over in review: the missed moment is asked as the lesson question ("tap what Nf5 stopped guarding"). |
| **Tactics** — Setup Trainer's first-miss board read, Pattern Recognition (identify / recognize / prevent), My Weaknesses | The Setup Trainer's first wrong try runs lesson steps 3 and 5 on that board; Pattern Recognition's "identify" is step 5 per motif; My Weaknesses positions are lesson boards. |
| **Chat** — the planned BoardQuery chat (WO-COACH-TEACHER WO-3 / ONE-CHAT) | "What are my targets here?" in chat answers from the same step-3 computer. |
| **Up next + Home suggestion** — `upNextPicker`, `homeSuggestion` | A thinking lesson is a bite; when it is the most important thing the record says, it is offered. |
| **Reward layer** — `rewardService`, `learnReward`, the green tile | A step proven green fires the same green tile; the coach's voice stays dry. |
| **Arrow door** (WO-ARROW-01) + `narrationSegments` | Show-step highlights and arrows go through the one arrow door, lit as the sentence names them. |
| **Beginner mode** — `isBeginnerMode`, `FirstRunStrength` | A beginner starts on steps 2–3 on quiet boards; difficulty only, never how much the coach says. |
| **Voice** — `voiceFacts` (G0), verbosity (G5), muted audits (G1) | Every spoken line computed, rotated, you/they; Brief caps voice to 2 sentences, the screen keeps the full text. |

## Prerequisite: ONE engine strength (David 2026-10-04: "we need to unify the strength of the engines")

The lesson game steers moves "within your strength", so there must be ONE strength.
Mapped 2026-10-04, today there are TWO systems that share no rating:
- **A, Elo-capped** (`coachGameEngine`: `UCI_LimitStrength` + Skill Level + book
  handling): Play with Coach, Learn free play (Easy / Medium / Hard chips), the
  Openings Play rung (`targetStrength`).
- **B, a Skill-Level dial** (`coachPlaySession.resolveConfig`, no Elo cap):
  calculation, endgame lessons, the opening-trap and mistake play-outs, From Your
  Games, Eval Lab, `/coach/session`. Each surface hard-codes "easy" / "hard", and
  `useEndgamePlayout` defaults the player to a FIXED 1500.

**The unification:**
1. **One move door:** every engine opponent goes through `coachGameEngine`. System
   B's dial is deleted, not left beside it.
2. **One strength input:** the ONE adaptive estimate (`getPlayerRatingEstimate`),
   adjusted live in-game by cpLoss against the POSITION (never the result) and
   damped (Foundation: strength matched in real time from move one; one detector,
   two consumers with capability evidence).
3. **The app is algo-based: the opponent ADAPTS by default (David 2026-10-04).**
   Every surface, play-outs included, plays at the student's measured strength.
4. **Easy / Medium / Hard stay as a NUDGE, relative to that strength** — "if the
   user wants to strengthen the coach a little or make it easier they can":
   Easier = measured − ~200, Matched (default) = measured, Harder = measured +
   ~200. The offset follows the student as they improve. ONE offset table shared
   with the puzzle difficulty cards (`DIFFICULTY_OFFSET`, studentPuzzleRating.ts),
   one vocabulary, `Record<Difficulty, number>`.
5. **Every surface declares its opponent's purpose** in one exhaustive table (no
   default): spar (Learn, Play, Openings), lesson (matched + steering toward
   today's skill), play-out (adaptive, the student proving a won position).
6. **One emission per engine move** (target strength, offset, purpose, surface),
   with an audit contract that every opponent reads the same number.

Built BEFORE the lesson game (P-strength), because steering needs the one strength.

## The lesson game and unification (David 2026-10-04)

- **Practice is on the same board, live**, right after a step is identified or
  taught: no separate drill screen.
- **Then a game focused on the day's lessons.** The coach chooses, among moves
  inside the student's strength window, the one that creates a moment for today's
  skill (leaves a piece of its own loose for "targets", makes a real threat for
  "am I safe"); the step's own computer confirms the moment is real. 2–4 steered
  moments per game, the rest natural; strength never drops to make room. At each
  moment the coach asks the lesson's question; the answer is recorded.
- **Last step: unification.** Lessons tie into every surface:
  - Learn free play: the lesson's question at the real moment ("today's lesson:
    what did that move stop guarding?"), ranked by the one door; narrations relate
    previous lessons to the live game.
  - Play with Coach: stays SILENT (locked 2026-09-23). Lessons tie in by the
    record (skill used / missed), by review afterwards, and (David's call, open) a
    quietly steered opponent.
  - Review: missed moments asked as the lesson question.
  - Tactics: lesson skills drive the puzzle queue and the Setup Trainer first miss.
  - Dashboard: lessons in Up next and the Home suggestion; progress on the heat map.
  - Chat: lesson questions answered anywhere.

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
- **Logic out of the 15k-line page.** A pure `thinkingLesson.ts` (choose the step
  from the curriculum + spine → pick a position that passes the fair-key filter →
  take the reading question from `buildReadingQuestions` → grade a tap SET with
  `gradeReadingAnswer` → next step) and a hook `useThinkingLesson`.
  CoachTeachPage only routes and renders.
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
