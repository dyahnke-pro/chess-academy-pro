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

## 🔒 THE UNIFICATION RULE — governs every section below (David 2026-10-04: "Make sure the rest of the plan follows this unification strategy")

Nothing in this plan is built FOR the lesson. Every piece is built ONCE, as the
app's piece, and the lesson is one consumer among several. Before any piece is
built, name its other consumers; if it has none, ask why not (capability parity).

| Piece | The ONE copy | Every consumer |
|---|---|---|
| Reading a question or a spoken answer | the ONE-CHAT parser inside `dispatchCoachTurn` | Learn, lesson, Play chat + mic, Review, Openings chat, Analyse, Explain-position, Tactics, Dashboard search |
| Answering about a board | the board computers behind that door (no lesson-only answerer) | the same list: "why is that a target?" works in Review chat as well as in a lesson |
| Tapping squares as an answer | one tap-answer hook + one DETERMINISTIC set grader (hits / misses / extras against `answerSquares`), NEW — `gradeReadingAnswer` asks an LLM for the verdict (G0) and grades text only | lesson, Analysis Practice (replaces its tap→text→LLM path), the revived Review reading challenge, Setup Trainer first miss. NOT Find the Square (a coordinate drill, different shape) |
| Reading what a wrong answer means | one wrong-tap → tag computer (NEW), written through the existing `logMisconception` beside `classifyMisconception` / `puzzleMisconceptionTag` | lesson taps, Review reading challenge, Analysis Practice |
| Recording an answer | the `capabilityEvidence` row, widened (origin `'lesson'`; taps in order, extras, timing, help, spoken/tapped, chain depth; no Dexie bump — unindexed). The parallel counters `recordReadingResult` (meta) and `recordTagDrillResult` fold into it | every surface that asks the student anything (Analysis Practice and Review reading write none today) |
| Ranking | `coachDecider.decide` | already one |
| The opponent | `coachGameEngine`, one strength, one offset table | Learn, Play, Openings, play-outs, the lesson game |
| Rewards | `rewardService` (`REWARD_SPECS` exhaustive; `proven`, `rankUp` exist) + `useProvenWatcher` generalised for tier unlocks | Tactics, Learn, lessons |
| The method vocabulary | ONE `ThinkingStep` union; `MethodHabit`, `LiveHabit` and the learn-lane claims (`method:blunder-check`…) map onto it by `Record`; `COACH_TAG_HABIT` re-keyed through it (no second tag table) | live coach, review, lessons, chat |
| Tiers | `teachingLayers.ts` (safety / principle / plan, red/grey/green, `leadLayer`, exhaustive `TAG_LAYER`) — the tiers are built ON it, not beside it | lessons, coach register, heat map |
| Running the steps on a board | `groundedAnswer.assembleMethodAnswer` (their idea → forcing scan → candidates → habit), grown into the one "run the steps here" computer | chat ("what's my thought process?"), lessons, carry-over |
| Loose pieces | ONE exported loose computer, extracted from the two private copies (`looseTrigger.ts`, `moveContrast.looseAfter`) | lessons, chat (fixes "nothing hanging" when Qb4 is loose), live coach |
| Choosing what to teach next | the curriculum + weakness spine + Up next | lessons, Up next, Home, Tactics queue |

A lesson-only version of any row is a defect, the same as an enum split.

## 🔒 CONTEXT GATE BEFORE EVERY PHASE (David 2026-10-04: "New context gains before each new section of this build. It is a large and important build. Be precise.")

No phase starts as code until its context is gained FRESH, at that moment (the
code moves between phases; a map from last week is stale):
1. **The four levels** (CLAUDE.md): Foundation → `PLAN.md` / `OUTLINE.md` state →
   `node scripts/surface-map.mjs --changed` for every file the phase will touch →
   read each of those files end to end, with line numbers.
2. **An inventory written into this doc** under the phase: what EXISTS (file:line),
   what is PARTIAL, what is MISSING. Only the missing is built; the partial is
   extended; nothing that exists is rebuilt beside itself.
3. **Every claim this plan makes about the code is re-checked** against that read.
   A wrong claim is deleted, not annotated.
4. **Blast radius named:** every importer and every surface the phase reaches, and
   the audit that covers each.

The 2026-10-04 baseline inventory (below, "Context inventory") is the starting
point for P0; each phase refreshes it.

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
   (`weaknessLifecycle` worsening) returns to the front, escalated. NOTE: the
   curriculum demotion this relies on does NOT exist — `reconcileCurriculum`
   drops mastered tags for good (its own comment says otherwise; its test pins
   the bug). Fixed first (P0). Higher tiers stay open; the coach goes back to fix it.
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
ORDER of the ten steps stays fixed: it is the habit being taught. One exception:
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
- Every question, in a lesson or anywhere else, enters through the ONE door
  (`dispatchCoachTurn`, below). Questions about the lesson position are answered
  by the SAME board computers every surface uses, with the lesson's answer key
  handed in as context — never a lesson-only answerer: "why is that a target?" →
  the attackers vs defenders it was graded on; "what about my bishop?" → that
  piece's safety and scope; "how many defenders?" → the count; "why not Nxe5?" →
  the engine read + proof line; "what should I play?" → the step's best move with
  its reason. These kinds then work on every surface that has a board (Review,
  Play chat, Analyse, Tactics), because they live in the door, not the lesson.
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
best-move regex and dropped "what I played". **The parser is built ONCE for the whole app** (next
section); lessons consume it.

**B. The microphone works — real spoken dialogue.**
- Two mics exist today: Learn's (`voiceInputService` via `ChatInput`:
  continuous listening, live transcript, barge-in) and `VoiceChatMic` on the
  other boards. Both send their transcript to the ONE door, so speech is read the
  same way on every surface. Verify end to end in a lesson, then extend it:
  - a spoken QUESTION is a question like any other;
  - a spoken ANSWER is a ChatTurn kind (`answer`, with referents): "the knight on
    c6", "c6 and e5", "the rook" (when there is one). A fast deterministic path
    reads plain square names; the parser resolves the rest; code validates every
    referent against the board, so no model decides a square. The same `answer`
    kind serves every surface that asks a tap question (Review cards, Tactics);
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
   mistakes do. The diagnosis is ONE computer (wrong answer → tag), shared with
   Review cards and Tactics misses.
5. **Guess-proofing:** extra taps count as wrong; the number of answers is told
   only after the first try; a set number of misses moves on to Show.

**C2. The lesson-answer record — the highest-trust data in the app (David 2026-10-04: "Absolutely collect this data. Its value and accuracy will be highest of all data collected.")**

Every answer is stored, because a lesson answer is the most CONTROLLED evidence
the app gets: the position, the question and the key are all known, so a wrong tap
names the misconception directly (game slips are inferred from a move).

Per question, one row — the ONE evidence shape every asking surface writes
(Review cards, Setup Trainer, Tactics, lessons), widened once, never a lesson
table beside it (capability parity):
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
| **Weakness spine** (`weaknessSpine.getUnifiedWeaknessProfile`: game misconceptions, mistake puzzles, classified tactics, opening weak spots) | WHICH step leads. "hung material" red → step 2 (am I safe?); "missed tactic: fork" red → step 5; "ignored threat" → step 1. One mapping, each tag → its step, held by re-keying the existing `COACH_TAG_HABIT` (`Record<MisconceptionTagId, …>`, coachDecider.ts:483) through `ThinkingStep`, never a second table. |
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
Before building: play the existing custom lesson on prod to see what works today
(done 2026-10-04: `audit-reports/hand-walk-custom-lesson-2026-10-04.md`, 17 flags).

**What the code actually has (inventory 2026-10-04):** `CustomLessonPart`
(customLessonPlan.ts:23) = `{tag, label, bucket, concept, patternThemes}`, up to
3 parts from curriculum items still open in the spine; `runCustomLessonPart`
(CoachTeachPage:2575) speaks the corpus passage then drills by MOVE. The thinking
lesson is a new part kind (`step`) on this type, branching in
`runCustomLessonPart`. Three things to fix on the way: a fresh user gets "not
enough games" and NO lesson (grey must teach, so a no-record path is needed);
`GENERAL_LESSON_RE` also catches "give me a lesson on the Caro-Kann"; the matcher
runs at :4239, BEFORE the training-aid block, not after it.

Every piece below exists; the lesson consumes it.

| System (exists) | Tie |
|---|---|
| **Question engine** — `positionReadingService.buildReadingQuestions` (21 types; `answerSquares` today means "any one square is right"; `misconceptionTag` an untyped string) | The lesson's tap questions ARE reading questions. Extend this engine: an "all of these" answer set, the full hanging/loose list (today `hanging[0]` only), the "what changed" and "is it safe" types, `misconceptionTag` typed as `MisconceptionTagId`, and the two G4.5 caps in its keys removed (`findAttackTargets` `.slice(0,5)`, `findForcingCandidates` cap 8). Graded by the new set grader. |
| **Curriculum + memory** — `coachCurriculumService` (`buildCurriculum`, `reconcileCurriculum`, `nextCurriculumItem`; arc of 3) + `weaknessLifecycle` (persistent / worsening; not read by the curriculum today) | The lesson PLAN is the curriculum, once its demotion bug is fixed (a mastered tag that reopens must come back). "Every visit different, remembers progress" is this record plus capability evidence. A step marked mastered that recurs in a game comes back escalated (unified-coach P6). No new ledger. |
| **Weakness spine** — `getUnifiedWeaknessProfile` (with `positions` from the student's games) | Picks the leading step and the boards it is taught on. |
| **Capability evidence + heat map** — `recordLaneEvidence`, `capabilityProven`, `heatMap` | Every tap is held/broken evidence on the existing tags; the heat map shows lesson progress with no new tile. |
| **Fundamentals** — the 33 named fundamentals, `/coach/fundamentals` | Step 6 teaches the pillars a student keeps breaking; a fundamental going green is the same event in both places. |
| **The one door** — `coachDecider.decide`, `factStakes`, need score | Ranks items within each step; the importance gate lets a critical step take the lesson. |
| **methodBeat** (the habit line in live play) | The live coach names the lesson STEP: "Before you move: what did their last move change?" Live play and lessons teach the same ten-step habit in the same words, from one step table. |
| **Learn free play** — the turn door (`learnTurnDoor.decideTurn`, exhaustive `LEARN_LANES`; thinking lanes already live: `blunderCheck`, `theirPurpose` / `theirIntent`, `checkMethod`, `countMethod`, `priorityFirst`) — carry-over is ONE new lane | Carry-over: when the student's own game hits a lesson skill at a real moment, the coach asks the same tap question there (Learn only, never Play — Play volunteers nothing). |
| **Review** — `selectReviewQuestions` (`ReviewQuestionKind` find-shot / trap / why) + the ORPHANED `ReviewReadingChallenge` (built, but `setReadingGate` is only ever called with null, CoachGameReview:1047) | ✅ BUILT 2026-10-05 — differently, and better: no new kind. At a `why` slip the review reads the tag game analysis filed at that board, maps it to its step (`TAG_STEP` lead, then the other steps that train the tag), and asks that step's tap question on the board before the move — the lesson's own runner, tap board and recorder (`slipStepsForGame` in the lesson door). Fair boards only; engine-keyed steps never stop a walk. The typed `ReviewReadingChallenge` card was dead code and is deleted. |
| **Tactics** — Setup Trainer's first-miss board read, Pattern Recognition (identify / recognize / prevent), My Weaknesses | ✅ (Setup Trainer, 2026-10-05: one question per first miss — "am I safe?" when something of yours hangs there, else "their targets"; `firstFairKit`.) The Setup Trainer's first wrong try runs lesson steps 3 and 5 on that board; Pattern Recognition's "identify" is step 5 per motif (✅ 2026-10-05: the example board asks "tap every piece the fork hits" before the arrow and highlights show it — `motifKit`, answers recorded as step 5; "Show me" still reveals); My Weaknesses positions are lesson boards. |
| **Chat** — the planned BoardQuery chat (WO-COACH-TEACHER WO-3 / ONE-CHAT) | ✅ 2026-10-05: "what are my / their / any targets" reaches the existing attack-targets topic (`findAttackTargets` + free pawns). The ONE-CHAT parser takes over when it leaves shadow. |
| **Up next + Home suggestion** — `upNextPicker`, `homeSuggestion` | A thinking lesson is a bite; when it is the most important thing the record says, it is offered. |
| **Reward layer** — `rewardService`, `learnReward`, the green tile | A step proven green fires the same green tile; the coach's voice stays dry. |
| **Arrow door** (WO-ARROW-01) + `narrationSegments` | Show-step highlights and arrows go through the one arrow door, lit as the sentence names them. |
| **Beginner mode** — `isBeginnerMode`, `FirstRunStrength` | ✅ BUILT 2026-10-05: `beginnerAllows` holds a beginner (`isBeginnerMode`) to steps 2–3 until both are green, in the lesson plan AND Up next's card; `boardsForStep(…, quiet)` puts the fewest-men boards first after their own failures. Difficulty only, never how much the coach says. |
| **Voice** — `voiceFacts` (G0), verbosity (G5), muted audits (G1) | Every spoken line computed, rotated, you/they; Brief caps voice to 2 sentences, the screen keeps the full text. |

## Prerequisite: ONE question route for the WHOLE app (David 2026-10-04: "building in the llm to all surfaces. Not just this one!!! UNIFIED!!")

The ONE-CHAT parser is built ONCE and every surface gets it; lessons are one
consumer, not the owner.

**Inventory (2026-10-04):**
- `dispatchCoachTurn` (src/coach/dispatchCoachTurn.ts) EXISTS but is 65 lines:
  `routeChatIntent` (navigate + ack, no LLM) else `coachService.ask`. No parser, no
  `ConversationState`, no emission. Callers: `VoiceChatMic` (runs its own
  `tryRouteIntent` first, `skipActionRouter:true`), `MasterclassCoachChat`,
  `CoachChatPage`, `ExplainPositionSessionView`, `CoachAnalysePage`,
  `GameChatPanel` (in-game + drawer; Analysis Practice and the Dashboard typed
  "Ask coach" reach it through the drawer).
- **Surfaces that call `coachService.ask` DIRECTLY (bypass the door):** Learn
  (`CoachTeachPage.handleSubmit`, 26 lanes in front of the brain at :6496), Review
  chat (`CoachGameReview:3268`), My Mistakes (`MistakePuzzleBoard:719`), the
  Dashboard search MIC (`SmartSearchBar:180`), Play's internal asks
  (`CoachGamePage:1363, 4079`), the auto-explain calls (`CoachAnalysePage:130`,
  `ExplainPositionSessionView:142`).
- ONE-CHAT is NOT built: no `ChatTurn`, no shadow, no emission. What exists to
  reuse: `callDeepseekWithTool` (coachApi:911), `translateToEnglish` (coachApi:2661,
  already called in four places — folds into the parse, never a second step),
  66 `questionIntents` detectors (the fast path; `ChatTurn` kinds are 1-to-1 with
  lane ids per ONE-CHAT FINAL §3), and for referents `pieceOptionsRef`,
  `resolvePieceQuestion`, `parseSquareQuery`, `parsePiecePurpose`,
  `parseSpokenMove`, `extractMentionedSquares` — EXTENDED, never a new parser.
- `surfaceContract.ts` is a NARRATION table (`register / withholds / speaks`). The
  answer-side scope ("what the answerers can see") is a new field ON it, not a
  second table.

**The build:**
- The parser goes INSIDE `dispatchCoachTurn`. Every bypassing surface above moves
  onto the door. Learn's page-state pre-routers (walkthrough, drill, stage refs)
  stay as Learn's fast-path registry (ONE-CHAT §8); the router pieces Learn
  hand-runs today (`applyCoachSetting` :3942, `matchTrainingAidRoute` :4264,
  `matchNavigationRoute` :4338) move behind the door TOGETHER, so nothing runs
  twice. `VoiceChatMic`'s private `tryRouteIntent` pre-pass moves in too.
- Every surface then reads questions the same way, with the same referents, seat
  and memory (`ConversationState`, NEW, inside the door).
- A spoken or typed ANSWER is a ChatTurn kind (`answer`, a set of referents),
  built on the referent parsers above; multi-referent answers ("c6 and e5") are
  the only new part.
- Rollout as ONE-CHAT §5: shadow on all surfaces at once, switched on at ≥95%
  measured accuracy; `audit-coach-all-questions-prod` + the lesson question set
  run against every surface.
- **Spoken turns too (David 2026-10-04: yes).** This WIDENS the approved ONE-CHAT
  spec (FINAL §1 scoped the parser to typed turns): mic transcripts and spoken
  answers go through the same parser on every surface. ONE-CHAT §1 is updated to
  match.
- **Kids (`/kid/*`) are unified too (David 2026-10-04), as a DECLARED SURFACE.**
  There is exactly ONE kid question box: `GuidedGamePage` (free-text ask + Why? /
  What now? / Help!) → `answerKidGameQuestion` (kidGameCoach.ts:342), which tries
  the grounded kid path and otherwise lets the LLM write the answer and strips
  claims afterwards (a G0 hole). The build: that box goes through the door as a
  `kid` surface row — answer kinds limited to hint / where-can-it-go /
  is-it-safe / concept, phrasing only through the kid seam (`voiceFacts`
  kidSafe / `getKidLlmResponse`), no SAN, kid memory its own (rule 10), the
  claim-stripper deleted. Two promised gates do NOT exist and get built: a test
  banning `getCoachChatResponse` from `Kid/` and kid routes reaching adult
  phrasing or coach state, and `audit-kid-llm-hallucination.mjs` (cited in four
  places, never written). Kid narration and hints are not questions and stay out
  of the door.

## Prerequisite: ONE engine strength (David 2026-10-04: "we need to unify the strength of the engines")

**Inventory (2026-10-04) — the earlier "System A Elo-capped / System B dial" split
was WRONG and is deleted.** Both already cap Elo (`UCI_LimitStrength`), and the two
already share their anchors (`coachGameEngine` delegates to
`coachPlaySession.configFromTargetElo`). What exists:
- `coachGameEngine.getAdaptiveMove` (Learn, OpeningPlayMode): teaching reply
  (`pickTeachingReply`: taught trap slip + home-opening steer) → explorer band →
  masters → Stockfish Elo-capped. One gap: the `analyzePosition` fallback (:898)
  passes Skill Level only.
- `coachPlaySession.resolveConfig` / `getCoachMove`: **Play's primary fast path**
  (`CoachGamePage:2480`), `MistakePuzzleBoard:992`, and every `useEndgamePlayout`
  caller (FromYourGames, Calculation, EvalLab, CoachEndgamePage, EndgameLessonTab,
  OpeningBlunders) — all pass `'hard'` with the 1500 default, so every play-out
  faces a fixed ~1800. `CoachPlaySessionView` is orphaned (nothing renders it).
- **Live strength matching is BUILT:** `liveStrength.ts` (damped +60 / −35, moves
  only on posed moments, graded by cpLoss against the position) fed by
  `useDiscussionPractice` beside the capability evidence — the Foundation's
  "one detector, two consumers" already. Only Play reads `liveRating`.
- THREE offset tables: puzzles ±200 (`DIFFICULTY_OFFSET`), `coachGameEngine`
  −300 / +200 (floor 600), `coachPlaySession` −300 / +300 (floor 400).
- Wrong rating source: `MistakePuzzleBoard` and `OpeningPlayMode`'s `studentElo`
  read `puzzleRating`.
- Full-strength on purpose (stay that way): the "watch it play out" demo
  (`CoachTeachPage:11682`), `punishPlayout`, `openingMatchup`, ModelGameViewer
  explore, MiddlegamePractice. `useChessGame`'s engine branch is dead code.
- Emissions: `coach-opponent-move-source` and `coach-move-fastpath` are free-text
  summaries, no structured row, no contract.

**The build (extend, don't rebuild):**
1. **One strength input:** `liveRating` (seeded from `getPlayerRatingEstimate`) on
   EVERY sparring surface — Learn, Openings, the play-outs — not only Play. Fix
   the two `puzzleRating` reads.
2. **One offset table**, `Record<Difficulty, number>`, shared by puzzles and every
   opponent: Easier / Matched (default) / Harder (David: "if the user wants to
   strengthen the coach a little or make it easier they can"). Merging moves
   "hard" by 100 on two surfaces — state it in the release note. `slipsAllowed`
   keeps student Elo and difficulty as separate inputs.
3. **Purpose table, exhaustive, no default:** spar (Learn, Play, Openings), lesson
   (matched + steering), play-out (the student proving a won position; may carry a
   deliberate offset — a proof against a weak defender proves little), demo
   (full strength, the five sites above). Each surface declares one.
4. **Steering is a layer inside `pickTeachingReply`**, beside the trap slip and the
   home-opening steer — not a new path. Nothing steers toward a skill today; that
   layer is the only new move-choice code.
5. **Play-outs stay on `getCoachMove`'s engine path** (no network book layers in
   an endgame) but read the one strength + offset.
6. **One structured emission per opponent move** (target, offset, purpose,
   surface) replacing the free-text summaries, with an algo-audit contract that
   every sparring opponent reads the same number.

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
    record (skill used / missed), by review afterwards, and a quietly steered
    opponent (David 2026-10-04: yes) — purpose `lesson` on the one engine, inside
    the strength window, never a word spoken.
  - Review: missed moments asked as the lesson question.
  - Tactics: lesson skills drive the puzzle queue and the Setup Trainer first miss.
  - Dashboard: lessons in Up next and the Home suggestion; progress on the heat map.
  - Chat: lesson questions answered anywhere.

## Wiring (from the code map, re-checked 2026-10-04)

- **Routing — through the ONE door.** "Start a thinking lesson" is a ChatTurn kind;
  `matchCustomLessonRequest` (customLessonPlan.ts:154, runs at CoachTeachPage:4239,
  BEFORE the training-aid block) extends to it as that kind's fast path (bare
  "teach me", "teach me something", "teach me chess", "teach me (how) to think").
  It must NOT catch "teach me something else / new" (walkthrough control), "what
  should I learn next?" (recommendation), "teach me tactics" (training aid), "teach
  me my weaknesses" (custom lesson) or any opening name — and `GENERAL_LESSON_RE`'s
  existing catch of "give me a lesson on the Caro-Kann" is fixed in the same pass.
  Today the bare phrases fall into `TEACH_PATTERN` and reach a bogus opening
  picker; this fixes that too.
- **Tap input — one shared hook + the new set grader.** `AnalysisPracticePage`
  (onSquareClick 331 → `gradeAnswer(square)` → LLM text grader; styles 434-436) is
  the one private tap-answer mode that shares the shape. Lift it into ONE hook
  (taps → square set → deterministic set grader, right/wrong styling, the "one
  more" nudge), move Analysis Practice onto it, then use it in the lesson (static
  board, as `reviewFen` / `lineWalkFen` already swap, ~12200), the revived Review
  reading challenge, and the Setup Trainer. Find the Square stays as it is.
- **Lesson state — the custom lesson's, extended.** A `step` part kind on
  `CustomLessonPart`, branching in `runCustomLessonPart`; state stays in
  `customLessonRef`, not a new ref.
- **Logic out of the 15k-line page.** A pure `thinkingLesson.ts` (choose the step
  from the curriculum + spine + `teachingLayers` → pick a position that passes the
  fair-key filter → take the reading question from `buildReadingQuestions` → grade
  with the set grader → next step) and a hook `useThinkingLesson`. CoachTeachPage
  only routes and renders.
- **One step vocabulary.** `ThinkingStep` + `Record<ThinkingStep, …>` (name, tags,
  computer, layer). `MethodHabit`, `LiveHabit` and the learn-lane method claims map
  onto it by `Record`; `COACH_TAG_HABIT` is re-keyed through it. The lesson,
  `methodBeat`, the live lanes, `assembleMethodAnswer` and the heat map read it.
- **Seen positions.** Nothing persists them today (`AdaptivePuzzlePage.seenIdsRef`
  is per-session). A small Dexie record keyed by FEN + step (version bump +
  upgrade, standing order).
- **Up next.** `PickKind` is a plain union and `homeSuggestion.TACTICS_IMPORTANCE`
  is a `Partial<Record>` (a new kind silently defaults to 50). Make both
  exhaustive, then add `thinking`; `CoachTeachPage` finishes the bite through
  `activeBite.finishBite` (it never does today).
- **Audit (algo rule).** One emission per decision (`thinking-lesson-step`: step,
  sub-question, key size, taps, outcome, source) through the one door, a contract
  row in `algoAuditContract.test.ts`, and a prod audit
  (`audit-learn-how-to-think-prod.mjs`) that plays a lesson by tapping and asks it
  questions by typing and by voice.

## Defects from the 2026-10-04 hand walk → where each is fixed

Walked live on prod, muted, on Knight_mare_01's real games
(`audit-reports/hand-walk-custom-lesson-2026-10-04.md`). The thinking lesson is
built ON the custom lesson, so every one of these is fixed in the phase that
touches it — none is carried into the new build. Each fix lands with a test on
the exact walk position that fails before and passes after; the phase is not done
until a re-walk of the same flow comes back clean.

| # | What the walk showed | Root cause | Fixed in |
|---|---|---|---|
| 1 | Three openers stacked and disagreeing (the picker's hole order, "the pattern still costing you most is missed tactical sequences", then a generic greeting) | three producers speak on Learn open, each ranking separately | P1 — ONE opener, from the one ranking door; the others removed (G8.5) |
| 2 | Picker names three holes, offers a chip for one | chip list and spoken list built separately | P1 — chips and words from the same list |
| 3 | Part "missed hanging pieces" read a passage about PINS | `searchTheoryPassage` picks prose by text match, not by concept | P1 — the part's teaching comes from the step table (`ThinkingStep` → computer + concept id), never a free text search |
| 4 | ~100-word passage read as one block | no sentence-grained reveal on this path | P1 — `narrationSegments`, one sentence at a time with its squares lit |
| 5 | "Now let's drill it" spoke over the passage (`tts-concurrent-speak`) | the drill line fires without awaiting the passage's voice promise | P1 — every lesson line awaits the previous voice promise (voice-gated, no timers) |
| 6 | "missed hanging pieces. you leave pieces…" lower-case after a full stop | label spliced into a sentence raw | P1 — sentence assembly capitalises at the joint; test on the label set |
| 7 | First wrong try handed over the answer | the drill's miss line reads the solution | P1 — Guide on a miss names the METHOD step, never the answer; the answer only after the set number of misses (Show) |
| 8 | "The c-file knight to e7" (should be "the knight from c6") | the move-to-words helper names a piece by its file letter | P0c — fixed in the shared move-wording helper, swept for every caller |
| 9 | Nxc7+ (+1.8, good) answered "not the strongest here" with no reason (best Nxe7 +3.5) | the drill grades best-or-wrong with no "good but weaker" verdict | P1 — a good move is called good, with what it wins, then "there's stronger"; the step-8 obvious-vs-killer rule reuses it |
| 10 | Solve line a bare move list ("the queen takes g7; then … the knight to h6") | solve line voices the PV, not the idea | P1 — the solve names the idea and the target (the loose queen) with the line as proof |
| 11 | "why is that move better than what I played?" answered as a generic best move, ignoring "what I played" | regex lane captured "better move", dropped the comparison | P0a — the parser's `compare-my-move` kind, with "what I played" as a referent |
| 12 | "They're winning (about 2.7)" — whose side? (student is Black) | eval phrased without the seat | P0a — the answerer states the eval from the student's seat ("you're down about 2.7") |
| 13 | "which of their pieces are loose?" → "Nothing of theirs is hanging" while Qb4 had no defender | chat has only a hanging computer; loose ≠ hanging | P0c — the one loose computer, wired into chat's answer and the lesson key |
| 14 | ✅ "what is my opponent threatening?" → true | — | kept; in the lesson question set as a regression check |
| 15 | Weaknesses: "Analyze 50 of 937 games" ran a batch of 184 | the button's count and the batch picker disagree | P0c — the label reads the batch the picker will actually run |
| 16 | Weaknesses header stuck at "5 of 937 analysed" mid-batch | header reads once, not on progress | P0c — header subscribes to the batch progress |
| 17 | First "Analyze" tap stalled at 5 games with no error; a second tap ran | unknown — not diagnosed on the walk | P0c — reproduce first (a muted probe on a fresh import), then fix at the cause; never a retry-to-hide |

Items 15–17 are outside the lesson surface but block it: lessons are taught on
the student's ANALYSED games, so analysis that silently stalls or misreports
starves the lesson of positions.

## Phases

Each phase opens with the CONTEXT GATE (top of this doc). Prerequisites first,
because every phase consumes them:

0a. **P0a: the ONE question route.** Parser + `ConversationState` inside
    `dispatchCoachTurn`; every bypassing surface moved onto the door (Learn,
    Review chat, My Mistakes, Dashboard mic, Play's and Analyse's internal asks);
    the answer-scope field on `surfaceContract`; the kid row + the two kid gates;
    walk defects 11, 12.
    Shadow first, switched on at ≥95%. App-wide.
0b. **P0b: ONE engine strength.** `liveRating` on every sparring surface, one
    offset table, the purpose table, the two `puzzleRating` reads fixed, the
    structured opponent-move emission. App-wide.
0c. **P0c: shared foundations.** The set grader + tap hook (Analysis Practice
    moved on); the widened evidence row (Analysis Practice and Review reading start
    writing it; the two parallel counters folded in); the one loose computer
    (extracted from the two private copies); the two G4.5 caps removed; the
    `reconcileCurriculum` demotion bug fixed; the `ThinkingStep` vocabulary;
    walk defects 8, 13, 15–17.
1. **P1: step 5 (their targets) end to end**, as a custom-lesson part, including
   the no-record path so a fresh user gets a lesson: fair key, Show / Guide /
   Solo, nudge, record + heat map, seen positions, own games then puzzles,
   questions answered through the door; walk defects 1–7, 9, 10. Re-walk the same
   flow on prod.
2. **P2: steps 3 and 2** (am I safe, what their move changed).
3. **P3: steps 4, 6, 7** (answer the danger, forcing moves, hit two).
4. **P4: steps 1, 8, 9, 10** (assess, candidates, calculate, is my move safe) +
   tiers on `teachingLayers` and unlocking.
5. **P5: the lesson game** (purpose `lesson`, the steering layer in
   `pickTeachingReply`).
6. **P6: unification** — carry-over as one new `LearnLane`, the revived Review
   reading challenge, the Tactics queue and Setup Trainer, Up next / Home, chat;
   its own "Learn how to think" tab if David judges it strong enough.

## Build log (2026-10-04, in progress)

**Built on `main` (local, one push at the end per David):**
- `thinkingLesson.ts` — the pure per-question tap state machine (found / complete
  / wrong / reveal, the ~8 s "one more" nudge, "I don't know", the answer
  summary with honest `prompted`).
- `thinkingLessonSession.ts` — the runner: Show → Guide → Solo (Solo only for a
  green step), wrong taps answered with the METHOD in Guide and silent in Solo,
  reasons for every key square after each question, earned praise only on a
  clean answer, one `thinking-lesson` row per question.
- `thinkingPositions.ts` + `thinkingLessonSource.ts` — the fair-key picker (1–4
  squares, no near miss, never a used board) over own-game boards first
  (mistake puzzles, then analysed games with the opponent's previous move and
  the board before it), then CC0 puzzles near the student's rating.
- `thinkingLessonMemory.ts` — boards used per step + where the last lesson
  stopped (the `meta` store, no migration).
- `thinkingLessonPlan.ts` — which step: tiers open by proof, red first within
  open tiers, then the earliest unknown, then review; steps with no fair board
  for this student are skipped and do not hold a tier shut; the tier-unlock
  line + reward (`thinking-tier-unlocked`).
- Six steps with kits: 2 what their move changed (own games), 3 am I safe,
  5 their targets, 6 forcing moves (checks), 7 hit two (the app's verified fork
  check), 10 is my move safe (the student's real played move).
- `thinkingLessonRecord.ts` — answers as capability evidence on the steps' tags
  (origin `learn` until the evidence workstream adds `lesson`), standing read.
- Learn wiring: bare "teach me" (whole-message matcher), typed answers
  ("c6 and e5", "I don't know"), mid-lesson questions hold the nudge, the tap
  board, `?lesson=custom|think`, the Coach hub **Custom Lesson** tile, a fresh
  student's custom lesson becomes the thinking lesson instead of a dead end.
- Audit: `scripts/audit-learn-how-to-think-prod.mjs` (step-aware), contract row
  in `algoAuditContract.test.ts`.

- **The books (David 2026-10-04: "make use of the books we have" → "We don't
  need to be quoting the books, just making sure the coach can teach the
  information").** After the worked example, each step teaches the idea a
  Coaches Library book teaches about that habit, in the coach's OWN words
  (`thinkingBookTeaching.ts`), with the source recorded by book + page + the
  sentence it comes from (a test fails if a rebuilt book moves it): perceiving
  threats (step 2), never losing material (3), counting attackers and defenders
  and their values (5), the double attack (7), seeing many moves ahead (9), the
  game lost from a "safe" position (10). Forcing moves and answering the danger
  have no source in these books and stay silent. `chess-concepts.json` is not a
  source — its passages are rewritten prose.

- Steps 4 (answer the danger), 6 alternates checks/captures, 9 (calculate: a
  3–5 ply line from a CC0 puzzle, "where does it end?").
- **The lesson game (P5).** `lessonSteer.ts` + `coachGameEngine.pickTeachingReply`:
  from the engine's top 3 moves, within the student's strength window
  (120/80/50/30 cp by rating), prefer one that leaves the student a fair
  question for today's step; at most 4 per game; after the taught slip, before
  the home steer. Learn offers "Play a game on this" when a plain-board lesson
  ends; after a steered move lands the board asks the step's question once.
  Steps that need a played move or a line (2, 9, 10) have no live-game version.
- **Up next's thinking bite is live**: Learn finishes it (`finishBite('thinking')`).
- **Merged:** P0b one engine strength, P0c-2 drill wording, P0c-3 (curriculum
  reopen-escalate, exhaustive bite kinds, Weaknesses walk defects 15–17), P0a
  question parser in shadow (defects 11–12 live), P0c-1 (set grader, tap
  hook, KNOW/USE evidence, one recorder), kids (computed answers, isolation
  gates; per-move praise replaced by what the move did).
- **One tap-answer machine.** The lesson's question state is the shared
  `squareAnswerGrader` state; held/prompted come from `answerEvidenceOutcome`.
  Decision taken at merge: a NUDGE is not help (it gives the count, never the
  square); a miss before any help is an honest, unprompted break. Lesson
  answers record through `recordAnswer` (origin `lesson`, never a game id;
  wrong taps file their misconception); standing and tiers read KNOW.

- **All ten steps have a lesson (2026-10-04).** Step 1 ASSESS asks whose king is
  in more danger (the one `kingSafetyRead`; only when exactly one king is exposed
  and a queen still faces it; the Show beat counts material first). Step 8
  CANDIDATES keys the engine's top moves within half a pawn of the best, by where
  each lands (fair only with ≥2 good moves, nothing in the 0.5–1.0 grey band,
  distinct squares); the planner enriches boards with the engine first
  (`StepKit.enrich`) and rules the step out if none enrich into a fair question.
  Neither step enters the lesson game (no live-game key).
- **One door for the lesson (`thinkingLessonStart`).** Plan, boards, record, the
  end of a lesson (Up next bite, tier unlock + reward + audit) — the page talks to
  the hook only (composition gate: page 60/60, total 253/253).

- **Owed (G8.5, P6 carry-over):** `stepForMethodClaim` / `METHOD_HABIT_STEP`
  (the ThinkingStep vocabulary) have no production caller yet — they exist for
  the carry-over, where Learn's live method lines name the step and file its
  evidence. That is narration wiring, held while the narration-unification
  session lands (David 2026-10-04: another session is unifying narration
  pathways).

- **The student's games choose the step and the boards (2026-10-05, David:
  "algo the questions … through weaknesses").** A step the student keeps
  failing in games — red heat-map tiles on its tags, weighted by open holes +
  breaks — is taught first, worst first, even from a locked tier; a step proven
  in lessons is not pulled forward. Boards from weaknesses filed under the
  step's tags go first, and the spine's own positions join the pool.
- **Up next asks the same chooser** (`lessonStepForCard`): the card goes red
  exactly when the lesson will teach a red step, names the skill and the step.
- **Setup Trainer first miss** asks one "their targets" question on that board
  (the lesson's own runner), then the retry.
- **PP on the PP (David 2026-10-05: "put pressure on the pinned piece … a
  principle, state it when it's relevant … wire it both ways").** One computer,
  `pinPressure` (both seats). Step 5 asks the pinned-piece form on a board
  where piling on wins; misses recorded both ways (fundamentals), the good move
  named (move fundamental), the pin concept carries the principle / warning,
  chat lesson.

- **D6 mixed practice + D8 session shape (2026-10-05).** When every step the
  student can be served in the open tiers is green (nothing red or grey due),
  the chooser serves a MIXED round (`StepChoice.reason: 'mixed'`) of the proven
  plain-board steps (no `adapt`, no `enrich` — a replayed move's lead line would
  name the step), when two or more exist and the pool has two boards for them;
  else the old one-board review. Each board first asks WHICH step applies
  (chips), graded by which step's kit has a fair key there (several → any is
  right), recorded through `recordAnswer` on the graded step's tags, then that
  step's tap question (`thinkingMixedRound.ts`, the session's `mix`). The close
  is computed in the door (`lessonCloseLine`): steps that turned green this
  lesson, a tier that opened (both praised, stems rotated), and the step the
  chooser picks next — none on a stopped lesson. A stopped lesson resumes at the
  board it stopped on with the same stage plan (`thinkingLessonMemory.resume`,
  meta store, no Dexie bump). The session's own close no longer claims "that
  habit is yours now" off one clean lesson — proof is the record's call.

## Work list for the end of the build (David 2026-10-04: "Any questions I ask can be tacked on to the work list at the end")

1. **More public-domain books for the library** — candidates to verify (public
   domain in the US + a clean Gutenberg/archive text): Emanuel Lasker *Common
   Sense in Chess* (1896), Capablanca *My Chess Career* (1920), James Mason *The
   Art of Chess* (1895) and *Chess Strategy* (1913), Réti *Modern Ideas in Chess*
   (1923), Steinitz *The Modern Chess Instructor* (1889), Emanuel Lasker
   *Lasker's Manual of Chess* (1925 English edition; check status). Each is a
   content job: confirm the text and rights, ingest into `src/data/library/`,
   then map its ideas to the steps and concepts it covers — prime gaps: forcing
   moves (checks first) and defence ("answer the danger"), which the current
   books do not teach.

**Merged:** P0b one engine strength; P0c-2 loose computer (`findLoosePieces`),
board-aware move wording, the one `ThinkingStep` table (lesson steps now read
order / tier / tags from it; the per-kit tag lists and the placeholder loose
function are deleted).

**Merge-time swaps still owed:** `recordLaneEvidence` origin `learn` → the
widened evidence writer with `lesson` + answer detail; tap handling → the
shared tap hook; typed-answer fast path → the door's `answer` kind.

## Decisions (David 2026-10-04)

1. **Spoken questions and answers go through the parser** — yes (widens ONE-CHAT
   FINAL §1).
2. **Green: ONE bar, evidence split by origin.** Lessons prove KNOW, games prove
   USE. A step unlocks on KNOW; the heat map shows both; where KNOW is green and
   USE is not, the coach drills the habit in live play. `capabilityProven` stays
   the one bar, applied per origin — never a second "proven" constant. (Today it
   skips prompted rows, counts only `posedImportance ≥ 80` and needs 2+ distinct
   `sourceGameId`s; the KNOW reading defines its own source key — distinct
   positions — inside the same function.)
3. **A tier unlocks when EVERY step in it is proven** (not `teachingLayers`' 2-tag
   bar, which stays for the coach's register).
4. Play's opponent steers quietly — yes.
5. Kids are unified as a declared surface.
6. **A "Custom Lesson" tile on the Coach hub** (David 2026-10-04: "I do also want
   a custom lesson tab in the coach tab" → "one tile, both lessons"). It opens
   Learn with Coach (`/coach/teach?lesson=custom`) straight into a lesson: the
   weakness-lesson picker when the student has holes (with "Learn how to think"
   beside it), and straight into "Learn how to think" when they have none (grey
   teaches). Up next's thinking bite uses `?lesson=think`. One lesson system,
   one more door — not a second page.

No open questions.
