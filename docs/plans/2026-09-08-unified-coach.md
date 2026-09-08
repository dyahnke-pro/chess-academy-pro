# The Unified Coach — vision, blueprint, and phased build plan

**Read this before starting ANY coach build.** The architecture reference (how
the app is wired today) is `docs/coach-system-map.md`. This file is the TARGET
we build toward and the order we build it in.

**Locked with David 2026-09-07 → 2026-09-08.** His words drive it; the
engineering improvements on top are called out in §7 and the decisions log.

---

## 0. 🚨 PRE-BUILD GATE — MAP EVERY SURFACE FIRST (David 2026-09-08, emphatic: "gotta map EACH SURFACE ENTIRELY before building! FOR THE LOVE OF GOD... even neighboring or touching surfaces should be reviewed to see if and how they will be affected").

**NO phase below starts as code until its surface map is written and reviewed.**
A phase that changes a shared computer (`positionFacts`, `computeImportance`,
`voiceFacts`, the weakness spine) touches EVERY surface that consumes it — that
is the whole point of a unified coach, and it is also the whole risk. Map the
blast radius before touching a line.

For each phase, produce a **Surface Map** covering:

1. **The target surface(s)** — read the ENTIRE component + its service path
   end-to-end (not a sample — §"Operate at full depth" in CLAUDE.md). What it
   renders, what it calls, what register it speaks, what state it owns.
2. **The shared computers it changes** — every function you'll edit
   (`positionFacts.computePositionFacts`, `narrationImportance.computeImportance`,
   `voiceFacts`, `getUnifiedWeaknessProfile`, …) and its INPUT/OUTPUT contract
   today.
3. **EVERY consumer of those computers (the neighbors)** — `grep -rln` each
   changed function and list every caller: review, learn, play, chat, tactics,
   endgame, openings/WLPP, kid (EXCLUDED — verify you don't touch it). For each:
   does the change reach it? intended or collateral? does it stay correct in
   THAT surface's register?
4. **The gates + audits that guard those surfaces** — which ship-check gates and
   which `scripts/audit-*.mjs` cover each affected surface (Post-Deploy matrix in
   CLAUDE.md). Every affected surface owes a green audit before "done."
5. **The contract deltas** — exactly what changes in each shared function's
   signature/behavior, and proof each neighbor tolerates it (a "note comes OUT"
   test per surface, David 2026-08-07).

Write the Surface Map into this doc (or a dated sibling) as the FIRST commit of
the phase. Then build. A phase whose neighbors weren't mapped is not started
correctly — stop and map.

---

## 1. The vision (David's words)

> "Moves do not exist in isolation. Fact A caused fact B caused fact C — THIS IS
> CHESS! If we cannot link them together then we are not doing it right."

> "Tie all of this together to form a more well-rounded and unified coach!
> Imagine yourself at the controls of the computer — which wires and tools would
> you bring together to teach students? All tools at the fingertips of the coach,
> and it decides which ones are important for the user to hear."

> "The coach decides. Meaning the SPINE decides. NOT the LLM."

> "Does it hit a hole THIS student keeps falling in — YES!"

> "DO NOT RESTRICT TO 1-2! The coach needs to decide what is important per user.
> Some users need more information in a certain position."

> "The more advanced player should get a DEEPER calculation. Not a shorter one."

> "This will unlock custom lessons — when a user asks 'what should I learn?' or
> 'teach me something,' it should aggregate their errors and develop a custom
> coaching session. The coach also has takeback, reset, set up any position —
> build this in too."

The coach is not a bag of independent facts read off a ranked list. It is ONE
brain that (a) sees every tool it has, (b) knows THIS student's holes, (c)
decides — in CODE — what to say, how much, and how deep, and (d) can act on the
board with its own hands, then (e) learns from what happened.

---

## 2. The four-layer blueprint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — CANDIDATE POOL  (everything the coach COULD say about this moment)  │
│   two kinds, both are "the coach's material" (David: "what it teaches from is  │
│   also the computer voice"):                                                   │
│   • COMPUTED-FROM-BOARD facts — positionFacts, tacticsDetector, causalChain,   │
│     threatOut+PV, criticalityScan, theoryDeparture, structurePlan, deliberation│
│   • RETRIEVED-AND-BOARD-GATED teaching — corpus notes (teachingNoteForBoard,   │
│     exact-position), book concepts, the opening's ideas.                       │
│   Every candidate is board-proven (G0/G3) or it does not enter the pool.       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 — THE SPINE SELECTOR  (CODE decides — G0. never the LLM)              │
│   inputs:  the candidate pool  ×  the STUDENT MODEL  ×  position criticality   │
│            ×  rating  ×  surface/register                                      │
│   decides: WHICH candidates speak, in WHAT ORDER, at WHAT DEPTH, and HOW MUCH  │
│            (an adaptive budget — NOT a 1-2 cap).                               │
│   the load-bearing new input is STUDENT WEAKNESSES — a candidate that hits a   │
│   hole this student keeps falling in is boosted and gets MORE words/depth.     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — ACTUATORS  (deliver it, in the surface's register)                  │
│   • VOICE     → voiceFacts (phrasing chokepoint; preferRaw bypasses the LLM)   │
│   • HANDS     → board-control tools (takeback/reset/setBoardPosition/playMove/ │
│                 startWalkthrough) invoked BY THE SPINE, not only by the LLM     │
│   • EYES      → lead-the-eye arrows + key-square highlights per named square    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4 — THE LOOP  (the coach learns from what happened)                     │
│   what the student did → weakness spine (mistakes, misconceptions, book-      │
│   departures, repeated holes). what the coach TAUGHT → a taught-concept ledger │
│   so it can tell "I covered this; did it stick?" Both feed Layer 2 next time,  │
│   and the CAPSTONE: aggregate → a custom coaching session on demand.           │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Maps onto today's code:**

| Layer | Built today | The gap |
|---|---|---|
| 1 Pool | fact-computers + corpus retrieval all exist (§4 of the map) | none structural — they're just not gathered into one pool the selector sees |
| 2 Selector | `narrationImportance` + `positionFacts` + `criticalityScan` (position + rating) | **does not consult the student model.** `PositionFactsInput` (positionFacts.ts:32) has no `studentWeaknesses`. This is Phase 1. |
| 3 Voice | `voiceFacts` (coachApi.ts:2487) | fine |
| 3 Hands | tools exist (`src/coach/tools/cerebrum/`) | only the LLM calls them; the spine can't |
| 3 Eyes | `narrationArrows`, causalChain arrows/highlights | fine; extend per new fact |
| 4 Loop | `getUnifiedWeaknessProfile` (weaknessSpine.ts:538), `coachCurriculumService`, `theoryDeparture` (per-game) | weaknesses don't reach Layer 2; no taught-concept ledger; no book-departure AGGREGATE; no custom-session builder |

---

## 3. Locked principles (every phase obeys these)

1. **G0 — the SPINE decides, never the LLM.** All of Layer 2 is deterministic
   code. The LLM only phrases the already-selected, already-ordered facts.
2. **G3 — board truth only.** Every candidate is chess.js/Stockfish/DB proven.
   No invented moves, lines, or "why." Never hallucinate.
3. **Adaptive budget, NOT a cap.** The selector decides how much to say per
   student × position. Some moments warrant a lot; some warrant silence. A
   fixed 1-2 sentence cap is BANNED (that's David's explicit correction). The
   only hard budget is the verbosity setting (G5) which the user themself chose.
4. **Deeper for stronger, not shorter.** Calculation DEPTH scales UP with rating
   (1400 → 3-4 ply, 1800 → 4-6 ply). What scales DOWN with strength is
   HAND-HOLDING (the remedial "here's what a fork is"), never the line length.
5. **Withhold the student's OWN move-to-find; spell the opponent's threat out.**
   The find-the-move honesty contract applies to what the STUDENT should
   calculate. A threat AGAINST the student is spelled out fully for everyone.
6. **Empty > generic > invented.** Silence when nothing board-proven warrants
   voice. A wrong link/claim is worse than a flat list.
7. **Per-surface register, one brain.** Review retrospective; Learn/Watch
   present-tense; Play silent-until-asked. Perspective you/they, never we.
8. **ONE adaptive algo — no orphans (David 2026-09-08).** There is a SINGLE
   source of adaptivity: the `userImportance` score (§5 P1). Every other
   "adaptive"/rating-scaled function that decides what/how-much/how-deep to say
   gets ROLLED INTO it (Phase 7). No second parallel criticality, no competing
   depth curve, no per-surface bespoke throttle. This is the CLAUDE.md
   "reconcile existing signals, don't add a second criticality" rule made a
   first-class principle. A leftover orphan adaptive function is a bug.
9. **Everything at the coach's disposal — nothing islanded (David 2026-09-08).**
   The candidate pool (Layer 1) enumerates EVERY fact-computer and the actuators
   (Layer 3) expose EVERY tool (voice + all board-control hands + eyes). The
   final pass proves nothing is orphaned: every computer can reach the selector,
   every tool can be invoked by the spine. "Largest build since G0" = the one
   where the whole toolbox is finally in one hand.

---

## 4. What is already SHIPPED (do not rebuild)

- **The causal-chain engine** — `causalChain.ts` + `causalChainVoice.ts`, wired
  into review, played/missed/allowed, 2 patterns, arrows/highlights,
  `fundamentalId` tags, validated on David's 930 real games, 226-check audit.
  Full detail: `docs/plans/2026-09-07-causal-chain-engine.md`. (PR #931 draft.)
- **The board-control hands** — the cerebrum tools exist and are tested.
- **The weakness spine** — `getUnifiedWeaknessProfile` is the canonical ranked
  query; it just isn't wired into live narration yet.
- **Per-game book departure** — `theoryDeparture.ts` computes it cleanly.
- **The curriculum sequencer** — `coachCurriculumService` orders weaknesses.

---

## 5. The phased plan (each phase shippable, each with a "note comes OUT" test)

### Phase 1 — WIRE THE STUDENT MODEL INTO THE SELECTOR + THE ADAPTIVE SCORE  ← the keystone
The one wire that turns a fact-lister into a coach that hits THIS student's holes.
This is where David's "algo/matrix, truly adaptive per individual" lands (§6.1).
- Add `studentWeaknesses?: WeaknessSignal[]` to `PositionFactsInput`
  (positionFacts.ts:32). A `WeaknessSignal` is a lightweight, precomputed shape
  (tag, `lifecycleStatus`, `trend`, openCount, severity) derived from
  `getUnifiedWeaknessProfile` + `getWeaknessLifecycle` ONCE per game/session
  (NOT per ply — latency, §6.4). It carries the individual's profile, not a
  rating band — that's what makes it adaptive to THE PERSON.
- **The adaptive score (the "algo").** For each candidate fact compute a
  deterministic `userImportance` score:
  `score = criticality × phaseWeight × weaknessMatchBoost`, where
  `weaknessMatchBoost` rises with the matched hole's lifecycle
  (`persistent`+`worsening` = biggest boost; `fixed` = ~none) and openCount.
  This is a TRANSPARENT FORMULA over the individual's profile — NOT a learned/ML
  model (that would violate G0 and overfit sparse data; even a low-game user has
  a real misconception profile). "Not all 1200s have the same strengths" is
  honored because the boost is keyed on the person's holes, never their rating.
- **Ordering = the score, most-important-to-user first** (§6.2). Primary sort is
  `userImportance` desc; the static safety→weakness→why→positional priority is
  only the TIEBREAK when scores are equal (a must-defend threat carries a
  criticality that already floats it up, so safety leads naturally).
- **Budget = the score too, no cap.** Total words/facts a moment gets scales
  with the top candidates' `userImportance` (a moment full of the student's own
  holes earns more voice), bounded only by the user's verbosity setting (G5).
- Surface-aware: same selection + score, register per surface (§7 principle).
- Test: a fixture student with a `persistent`+`worsening` fork hole gets the
  fork candidate boosted to the lead with MORE depth than a default student, on
  the same board; a student whose fork hole is `fixed` gets it terse or silent.

### Phase 2 — THREAT DEPTH REWORK
- KILL the remedial explainer (`describeThreatRecognition`, groundedAnswer.ts
  ~4973) from the default path. It's obvious, remedial, unwanted.
- Rating-scale threat depth via engine PV (`computePvLine`): 1400 → 3-4 ply,
  1800 → 4-6 ply, minimum 1 (David's numbers). Never hallucinate — cap depth at
  the reliable PV window.
- SPELL THE LINE OUT for everyone (opponent threat = not the student's
  find-the-move; principle 5). Frame forced vs best-but-not-forced honestly
  ("not forced, but their strongest try is…"). Best moves that lead to a losing
  position are valid content (David #4).
- Attach causal-chain logic to threats where a chain proves the WHY of the
  threat ("their queen on f3 blocks the knight, so … threatens to trap it").
- Test: threat narration at 1400 vs 1800 differs in depth; no remedial sentence;
  the spelled line is board-accurate every ply (extend the causal-chain audit).

### Phase 3 — BOOK-DEPARTURE WEAKNESS SIGNAL
- Aggregate `theoryDeparture` across a user's games → a per-user stat: do they
  leave book too early/often, and where (which opening, which ply)?
- Cost gate: only a departure that MEASURABLY hurt (eval drop after leaving)
  counts as a weakness — leaving book into a fine sideline is not a hole. The
  "too early / costly" threshold is an ALGO (§6.5) — a score over rating + the
  individual's profile + the departure's eval cost — not a hardcoded per-band
  constant.
- New weakness bucket type folded into `getUnifiedWeaknessProfile` (so Phase 1
  automatically teaches it). The coach then explains the THEORY behind the
  right opening moves and why, in place of the repeated mistake.
- Test: a user with repeated costly early departures surfaces a book-departure
  weakness; a disciplined user does not.

### Phase 4 — SPINE-DRIVEN HANDS (the actuator wire) — DEFERRED (David 2026-09-08)
David, after we scoped it: **"we won't have the right answer until I use it.
Right now we have the undo button, that should be enough."** So takeback is NOT
built now — the existing undo button covers it, and the real shape only becomes
clear once he uses the custom lessons (P5). Do NOT build a speculative takeback
mechanic (a first version that dressed up the drill's wrong-move nudge as a
"takeback" was scrapped — a drill retry is not a takeback).

The captured DESIGN INTENT for when we revisit (from real use):
- Takeback lives ONLY in the custom training session (P5), coach-decided,
  ADAPTIVE to the student (the deeper the habit, the more vigilant the coach) —
  never in normal Learn play, never in Play.
- The authentic trigger is replaying your OWN historical blunder in the drill of
  your own position (we store `playerMoveSan`) — "that's the move that cost you;
  take it back."
- **On a coach-decided drill, a wrong move should not even move the piece** —
  reject it outright rather than move-then-undo (David's steer). That makes a
  separate "takeback" largely redundant in the drill.
- Revisit after David has used the custom lessons; let real use pick the shape.

### Phase 5 — CUSTOM COACHING SESSION (the capstone)
- Entry points: "teach me something" / "what should I learn?" → aggregate the
  student's top weaknesses (spine + book-departures + repeated holes) via
  `coachCurriculumService` → generate a WLPP-shaped session built from REAL
  positions from the student's OWN games (G3 — their boards, not invented).
- The session teaches the concept, drills it (feeds My-Mistakes / SRS), and the
  taught-concept ledger (Layer 4) marks it covered so the loop can check if it
  stuck.
- Test: a fixture student with 3 known holes gets a 3-part session, each part
  anchored to a real position from their games, each feeding the drill queue.

### Phase 6 — CLOSE THE LOOP (the memory ALREADY EXISTS — consume it)
David 2026-09-08: *"app should already have memory!!!"* — correct. Do NOT build
a new ledger. The recurrence + taught-and-recurred signals already exist:
- `weaknessLifecycle.ts` — `status: persistent` (recurred recently AND in the
  past) + `trend: worsening` IS "keeps falling in over time." Consumed by P1's
  `weaknessMatchBoost`.
- `coachCurriculumService.ts` — a taught concept goes `mastered`; if it recurs it
  auto-demotes `mastered → queued`. That IS the taught-then-repeated escalation.
- So Phase 6 is just: make sure P1 reads `lifecycle.status/trend` and the
  curriculum's `mastered→queued` demotion (escalate a recurred-after-teaching
  hole harder than a brand-new one). Nothing new to persist.
- Test: a concept marked `mastered` that recurs is treated with escalation, not
  as a first introduction.

### Phase 7 — CONSOLIDATION: roll every orphan adaptive fn into the algo + wire everything (David 2026-09-08)
The closing sweep that makes it ONE coach, not a pile of features (principles 8+9).
- **Roll in the orphan adaptive functions.** After P1's `userImportance` exists,
  reconcile every OTHER rating-scaled/adaptive decider INTO it. Each orphan
  either delegates to the single algo or is deleted. Target: one adaptive source
  of truth. Do this per the §0 surface map — these live across review/learn/play/
  tactics/openings. **The verified inventory (mapped 2026-09-08):**
  - *(A) importance/criticality:* `criticalityThresholds` (criticalityScan.ts:71
    — the de-facto ROOT; `computeImportance`, `minSwingPawns`, `scanCriticality`,
    `computePositionFacts` all derive from it → absorb FIRST), `computeImportance`
    (narrationImportance.ts:82), `computeCriticality`/`criticalitySignalsFromAnalysis`
    (criticality.ts:62/:81 — the ONE criticality decider NOT rating-scaled;
    reconcile its score bands with the rating-scaled root), `minSwingPawns`
    (reviewTurningPoint.ts:63), `isCriticalThreat`+`alertSensitivityMultiplier`
    (tacticAlertService.ts:295/skillScaling.ts:25).
  - *(B) depth/ply:* `pvBandForRating` (mistakePuzzleService.ts:99), `depthFor`
    (causalChainVoice.ts:36), `getTacticLookahead` (tacticAlertService.ts:237).
  - *(C) verbosity/how-much:* `resolveLlmNarrationDensity` +
    `resolvePhaseNarrationVerbosity` + `applyBriefVoiceCap` (coachNarration.ts),
    `getVerbosityInstruction`/`VERBOSITY_INSTRUCTIONS` (coachPrompts.ts),
    `resolveVerbosity`/`shouldCallLlmForMove` (coachCommentaryPolicy.ts),
    `sentenceBudgetExceeded` (voiceContainment.ts). NB these encode the USER's G5
    verbosity choice — the algo governs importance/depth; G5 stays the user's own
    ceiling. Reconcile, don't erase the user's setting.
  - *(D) rating-band helpers:* `ratingBandFor` (theoryDeparture.ts:59) AND a
    SECOND `ratingBandFor` (amateurPlayCache.ts:34) — name collision, different
    returns — plus `explorerBandForElo` (coachGameEngine.ts:246): three
    overlapping explorer-band pickers to unify. `wrongTriesBeforeHint` /
    `detectStruggleTier`+`ratingMultiplier` (skillScaling.ts / tacticAlertService)
    are training-aid tiers; `hintStartTier` (skillScaling.ts:49) is exported but
    UNWIRED (dead — delete or wire during the sweep).
  - *adjacent, NOT rating-adaptive (leave unless a reason emerges):* `frequencyTier`
    (courseWhyFacts.ts), `statusBandChange` (positionFacts.ts:108),
    `defaultDrillTier` (endgameDrillService.ts).
- **Wire everything into the coach.** Confirm the candidate pool sees every
  fact-computer (§4 of the system map) and the spine can invoke every actuator
  (voice + all cerebrum board tools + eyes). Nothing islanded, no dead-end
  computer, no tool only the LLM can reach.
- **Completeness gate + audit.** A test that enumerates the fact-computers and
  the tools and asserts each is reachable by the selector/spine (a "note comes
  OUT / tool CAN be invoked" proof, not an import check). Then the 3-instrument
  audit across every affected surface.
- Test: no orphan rating-scaled decision survives outside the algo; every
  computer + tool is reachable.

Sequencing logic: P1 is the keystone (nothing else personalizes without it) and
now carries the adaptive score + the existing lifecycle/curriculum memory. P2 is
the highest-visibility slice and rides P1's rating/depth machinery. P3 adds a new
weakness the P1 wire then teaches for free. P4/P5 are the "unified" payoff and
depend on P1–P3. P6 is folded into P1 (consume, don't build). P7 is the closing
consolidation — it can only run once the algo (P1) exists to roll orphans into,
so it is LAST, after every feature phase, as David specified ("when all done").

---

## 6. The 7 open questions — DAVID'S CALLS (2026-09-08)

1. **The budget function → RESOLVED: build the algo, keyed on the individual.**
   David: *"can we build a matrix or algo for this? that would make it truly
   adaptive. not all 1200 have the same strengths."* YES. Budget + boost are a
   deterministic scoring FORMULA over the individual's weakness profile +
   lifecycle (Phase 1's `userImportance` score), NOT a rating-band lookup and
   NOT a learned/ML model (G0 + sparse data). Adaptive because its inputs are
   the person's holes. NO cap except verbosity (G5).
2. **Ordering → RESOLVED: algo, most-important-to-user first.** David: *"i like
   your order but maybe algo that also? most important to user first?"* Primary
   sort = the `userImportance` score; the static safety→weakness→why→positional
   list is only the tiebreak. A must-defend threat floats up on its own high
   criticality, so safety still leads naturally.
3. **Memory → RESOLVED: it already exists, consume it (do NOT rebuild).** David:
   *"app should already have memory!!!"* Correct — `weaknessLifecycle`
   (`persistent`+`worsening`) + `coachCurriculumService` (`mastered→queued`
   demotion on recurrence) already give recurrence AND taught-then-repeated.
   Phase 6 folds into Phase 1 (§5). Nothing new to persist.
4. **Latency (precompute per game) → APPROVED.** David: *"that way coach does not
   get distracted with new issues, but stays scoped to the teaching at hand!!!
   GREAT CALL OUT!"* The weakness profile is computed once per game/session; a
   hole created mid-game influences narration next game. This is a FEATURE (scope
   discipline), not just a perf trade.
5. **Book-departure threshold → RESOLVED: algo, adaptive.** David: *"book, algo
   that also."* The "too early / costly" threshold is a scoring function over
   rating + the individual's profile + the eval cost of the departure — not a
   hardcoded per-band constant. Same adaptive-to-the-person shape as #1.
6. **Custom-session size + entry → DECIDED (David 2026-09-08).** SIZE = adaptive,
   as many parts as live top holes, ~3 default. ENTRY = **from Learn with Coach**
   (`/coach/teach`) — build P5 to mount the session inside the Learn-with-Coach
   flow. **Learn with Coach OPENS by OFFERING A PICKER and STATING it in the
   opening phrase** (David 2026-09-08): the coach's first line names/offers the
   pick — the student's aggregated top holes as choosable options ("want to work
   on X, Y, or Z?" / "or tell me what you'd like") — rather than waiting for a
   typed "teach me something". The opening phrase STATES the picker; the picker is
   the aggregated-weakness session menu.
7. **Takeback policy → DECIDED (David 2026-09-08).** Never on Play (locked); in
   Learn, offer a takeback **only on a weakness-matched blunder** (the blunder
   hits one of the student's tracked holes) — targeted, not on every blunder.

**The through-line of David's calls:** everything adaptive is an ALGO keyed on
the INDIVIDUAL (their weakness profile + lifecycle), never a rating-band table —
and it's a transparent deterministic score, not a learned model (G0). Memory is
reused, not rebuilt. Nothing above blocks starting Phase 1.

---

## 7. Improvements made on the original idea (the no-yes-man record)

- **Eval-bar-movement importance filter → rejected, replaced.** "Anything that
  moves the eval bar is important" fails four ways (sharp-but-flat, decided
  blow-out, standing threat with flat bar, quiet lesson). Replaced with
  rating-scaled decision-leverage + realized-swing + must-defend + teaching-beat,
  all under a contested gate (silent in a decided game). (Already locked in
  `CLAUDE.md`.)
- **"Advanced = shorter" → corrected to "advanced = DEEPER."** Depth scales UP
  with strength; only hand-holding scales down. This inverted my first instinct
  and is now principle 4.
- **The candidate pool is BOTH computed facts AND retrieved notes** — your point
  that "what it teaches from is also the computer voice." Layer 1 treats them as
  one pool so the selector ranks a corpus note against a computed fact evenly.
- **The loop needs a taught-concept ledger, not just a mistake count** — flagged
  as the thing that makes "a hole THIS student keeps falling in" real over time
  (Phase 6 / open question 3).
- **Precompute-per-game weakness profile** — so personalization doesn't put an
  async Dexie read on the per-ply hot path (open question 4).

---

## 8. Decisions log

- 2026-09-08 — **Phase 5 BUILT** (the custom lesson): `customLessonPlan.ts` (pure
  leaf, 16 tests) turns the curriculum arc + weakness profile into an ordered
  ~3-part lesson + the code-authored picker opening phrase/chips + the
  request matcher. Wired into `CoachTeachPage`: the kickoff opener now STATES the
  picker (names the top holes, offers chips); tapping a hole runs the lesson —
  each part TEACHES the concept (grounded corpus prose via `searchTheoryPassage`,
  no LLM) then DRILLS the student's OWN flubbed positions (`buildMistakeDrillQueue`
  by motif); `completeDrill` advances parts and closes on the arc sync. Typed
  "build me a lesson" works too. New audit `audit-unified-coach-prod.mjs` +
  `seed-weakness-profile.mjs` SEEDS a real profile so every inert personalization
  function fires — 7/7 green on localhost (picker names holes, chips render,
  voice fired, hole→concept-teach + own-position drill, correct move accepted).
  See `docs/plans/2026-09-08-phase5-surface-map.md`.
- 2026-09-07 — causal chain: rating-scaled depth; unprovable link = silent;
  all surfaces, shared engine, per-surface register. SHIPPED (PR #931 draft).
- 2026-09-08 — unified-coach vision captured. SPINE decides (G0), adaptive
  budget (no cap), deeper-for-stronger, board-truth. Build order P1→P6, P1
  (weakness→selector) is the keystone.
- 2026-09-08 — §6 RESOLVED with David: (1) budget = adaptive algo keyed on the
  individual's profile, not rating band, not ML; (2) ordering = the score,
  most-important-to-user first, static list is tiebreak; (3) memory already
  exists (`weaknessLifecycle` + `coachCurriculumService`), consume don't rebuild,
  Phase 6 folds into P1; (4) precompute-per-game APPROVED (scope discipline);
  (5) book-departure threshold = adaptive algo. #6/#7 decided at their phases.
- 2026-09-08 — **Phase 2 + 2b BUILT** (threat depth): remedial explainer removed
  from the review callout; `pvDepthForRating` (single PV-depth source) scales
  threat depth by rating; deep spelled lines confirmed running in capped
  production; non-forcing decisive lines now spell (labelled "plan/idea" vs
  "threat"). See `docs/plans/2026-09-08-phase2-surface-map.md`.
- 2026-09-08 — **Phase 1b BUILT** (live tactic-motif boost): `speakDeepestLookahead`
  now prefers a deep tactic whose motif is a hole the student keeps falling in
  (via the tactic-vocabulary bridge + matchTacticPattern) and tags it honestly
  ("you tend to miss this" / "keeps catching you"). Narrow: one function + the two
  hooks that already hold the Phase-1 weaknessRef (usePositionNarration,
  usePhaseNarration). 38 liveTacticsContext tests green. Closes the tactic-motif
  gap Phase 1 left on the live play/teach lookahead.
- 2026-09-08 — **Phase 3 BUILT** (book departure): `bookDepartureWeakness.ts`
  (adaptive gate + aggregator) + `bookDeparturePrecompute.ts` (masters-only,
  meta-cached, stale-while-revalidate) folded into `getUnifiedWeaknessProfile`;
  `conceptForCluster` teaches opening theory. Phase 1's selector auto-teaches it.
  See `docs/plans/2026-09-08-phase3-surface-map.md`. Follow-ons: analyze-pipeline
  refresh trigger, openingName population, lifecycle participation.
- 2026-09-08 — David, emphatic: **map EACH surface ENTIRELY before building,
  and every neighboring/touching surface for blast radius.** Locked as §0 —
  the pre-build gate. No phase starts without its surface map.
- 2026-09-08 — **Phase 1 BUILT** (Option B, David gave full autonomy). Shipped:
  the `tacticVocabulary.ts` bridge (compile-exhaustive, fixes the silent
  discovery/discovered_attack mismatch), the `weaknessSignal.ts` pure leaf
  (buildWeaknessSignals + boostFor + matchers), `weaknessSignalLoader.ts`
  (memoized once-per-game) + `useWeaknessSignals` hook, the `positionFacts`
  studentWeaknesses re-rank post-pass, threaded into learn/play/openings
  (usePositionNarration/usePhaseNarration/useLiveCoach/computeWhyBestMove) and
  review (buildReviewSegments recurrence recap via causal-chain tags). Optional +
  inert until fed; kid never fed. 35 unit tests green, typecheck clean.
  **Phase 1b (deferred, needs its own §0 surface map):** boost the LIVE tactic-
  fact pipeline (liveTacticsContext / playCommentary) so fork/pin/skewer motif
  holes re-rank in live play/teach commentary too. positionFacts already covers
  the hanging/must-defend hole; review covers retrospective tactic holes; 1b
  closes the live tactic-motif gap.
- 2026-09-08 — David: **roll every orphan "adaptive function" into the new algo
  when all done** (principle 8) + **wire ALL tools into the coach so everything
  is at its disposal** (principle 9). Added as Phase 7 (the closing
  consolidation) + Layers 1/3 completeness. David: "largest and most important
  build since going G0."

## 9. Next-session pickup

§6 decisions are RESOLVED (see §6 + decisions log). Phase 1 is greenlit in
principle — but do NOT open an editor yet:

1. **FIRST: write the Phase 1 Surface Map (§0).** `computeImportance` +
   `positionFacts` are shared by review, learn, play, chat, tactics, endgame,
   openings/WLPP. Read each consumer, confirm the `userImportance` re-rank stays
   correct in each register, list the gates/audits each owes. Commit the map.
2. THEN Phase 1: add `studentWeaknesses` to `PositionFactsInput`
   (positionFacts.ts:32), precompute from `getUnifiedWeaknessProfile` +
   `getWeaknessLifecycle` once per game, add the deterministic `userImportance`
   score (criticality × phase × weaknessMatchBoost, boost keyed on
   lifecycle `persistent`/`worsening`), re-rank + budget by it. Ship with the
   "boosted fixture" test (persistent hole → lead + more depth; fixed hole →
   terse/silent).
3. THEN Phase 2 (threat depth) as the first visible slice — its own Surface Map
   first (it touches review + learn + chat threat paths).
4. Every wire gets a "note comes OUT" test per affected surface (David
   2026-08-07). Keep it G0/G3. Every affected surface owes a green audit before
   "done."
