# One Coach — the need-based selector, the game as the unit, the refuted alternative

**Status:** plan, committed before code (2026-09-15). Supersedes nothing; it is the
next build on top of `docs/plans/2026-09-08-unified-coach.md` (the four-layer
blueprint) and `docs/plans/2026-09-14-computed-concept-detectors.md` (P1–P5
shipped, P6 core landed). Read both plus `docs/coach-system-map.md` before code.

**The standard it implements:** CLAUDE.md → "NARRATION IS SELECTED BY THE
STUDENT'S COMPUTED NEED — the app standard (David 2026-09-15, LOCKED)".

---

## 0. Where we want to be (the picture, in full — David 2026-09-15: "I want EVERYTHING")

One coach, one brain, everywhere in the app. Hand it any sequence of moves — a
game you just lost, a line you asked to learn, the game you're playing right now
— and it reads it the way a master reads a position handed to him cold: names
what the game is about, finds the one to three moments it turned on, links them
into a thread, and says only that. It knows what you keep getting wrong and
steers the thread toward it. Every word traces to something computed — a DB
frequency, an engine line, a concept with an invariant, your own mistake record
— and the model only phrases. The tabs differ in tense and timing, never in
intelligence: review says "you skipped …c5 and here is what it cost"; Watch says
"this is the …c5 break, and here is what it does"; Play says nothing until the
phase turns or you ask. A book move gets no sentence. A quiet move gets no
sentence. The coach's silence is as computed as its speech.

David's words that shaped it, in order:
- "My excitement for this build lays with the new computers and stronger coach.
  What I want most is a stronger computer voice that is able to teach more to
  users."
- "I want it to treat every position like the master puzzles." → refined the
  same night to: "I want the coach to view each game like a master level puzzle.
  Not each move." — the UNIT is the game (or the taught line), not the ply.
- "The refuted alternative — this is the big one … 2 sounds right." (and the
  honest answer he asked for: the example sentence was written by the model as an
  illustration of the FORM, not computed — see §6.)
- "Link them, yes. This is one computer not 5 separate ones … One unified coach,
  whose abilities are the same no matter where in the app you are."
- "I do not like review. It takes too long and says too much in opening book
  moves. My hope is that these builds improve narrations throughout the entire
  app simultaneously … while maintaining the individuality, that already exists,
  that make those tabs unique. The retrospective narrations, the subtleties
  remain while what the coach says improves."
- On R2 (the ≥80%-of-opening-plies-get-a-why rubric, locked 2026-07-19 after
  "there is no coach narration"): "Make it algo based. Narrate where the data
  tells us the user needs narration/teaching." → "New app standard?" → yes,
  locked in CLAUDE.md.

### Pushback that survived (so it is not re-litigated)
- "Every position like a puzzle" breaks literally: a puzzle has a forcing line
  with one dominant concept; ply 3 of the Scandinavian does not, and forcing a
  fact anyway produces the "developing move eyeing the centre" filler David
  deleted. Resolution: every position is EVALUATED like a puzzle; only the ones
  with a real point speak — David then sharpened it to the game as the unit.
- A game is not one answer; it is a thread with 1–3 knots. The thesis + moments
  + chain is that thread.
- A taught line is not a game: its "puzzle" is the structure/plan the line
  commits to (already the plan-as-itinerary shape); the same selector reads it.
- "More teaching" ≠ more sentences. The Narration Voice Rules already ban
  filler; strength is coverage of COMPUTED facts where the student needs them.
- Cold start: a new user has no data, so "the data" says nothing; the default
  must be TEACH (rating prior) or day one is the July silence again.
- "Needs teaching" ≠ "made a mistake here": a correctly played ply still earns
  the refuted alternative when the student has gone wrong there in other games.
- Need must not become a second criticality — it is the student term of the
  existing importance filter (unified-coach P1 `userImportance`).
- Simultaneity's only cost is audit load (review + teach + play audits on every
  push of this build). Accepted.

## 1. What we've built, and what each piece buys

- **One concept engine** (`conceptEngine.conceptForLine` + `tacticInvariant`): a
  line → a named concept with an invariant sentence. Master Level puzzles, drills,
  hints, review facets and now the live Learn walkthrough all speak from it.
  *Buys:* one vocabulary for "what is this tactic" across every surface — the
  thing that was five.
- **One tactic classifier** (2026-09-15): the persisted weakness tag is a
  projection of that engine (`missedTacticService.detectTacticType` →
  `conceptForLine` through `tacticVocabulary`; gate `tacticTypeUnification.test.ts`).
  *Buys:* a student's weakness and the live fact finally match — the steer toward
  your holes is possible.
- **Landed-tactic splice** (P5, proven on prod 2026-09-15 —
  `audit-concept-gameplay-prod.mjs` 8/8, the pin at …Bg4 SPOKEN in a live Lasker
  lesson): when a taught move lands a tactic, the computed beat is spoken
  mid-lesson. *Buys:* the first computed teaching inside a walkthrough, not just
  puzzles.
- **The fact computers**: `positionFacts` (threats, structure→plan, move-reason,
  importance), `scanCriticality` (decision leverage, rating-scaled), the null-move
  threat probe (`threatOut.computeMustDefend`), the causal-chain engine
  (cause→effect across moves), mate/endgame technique (`matePatterns`,
  `endgameTechnique`), `positionalRead` (best-placed piece + "trade it off",
  outposts, open files, development, castled king), `latentDanger`,
  `opponentIntent`, `concessionBeat`, `backwardLook`, `deliberation`
  (engine alternatives weighed — already spliced into Watch),
  `describeThreatPrevention` (positive prophylaxis), `theoryDeparture` (DB main
  move + %, departure ply), `bookDepartureWeakness`, punish gems on the path
  (`openingFactChains`), `reviewTurningPoint` / `reviewHinge` / `reviewStoryGame`
  (review's game-level layer). *Buys:* the raw material for "where did it turn"
  and "what does this commit you to" already exists. **Verified 2026-09-15 —
  piece quality, the tempo/development ledger, positive prophylaxis and review's
  game-level computers all EXIST; an earlier draft called them missing. See §1a.**
- **The chokepoint + importance filter** (`voiceFacts`): the computer selects and
  orders, the model phrases, `preferRaw` skips the model when the prose is tight;
  `DEGRADE=llm` audits prove surfaces still answer with the model dead. *Buys:*
  G0 is enforced by wiring, not by prompts.
- **The weakness → selector wire** (`positionFacts.applyWeaknessBoost`, fed by
  teach, play, phase narration, live coach, position read, opening play).
  *Buys:* live clauses already re-rank toward the student's holes — the
  personalization loop exists at ply level; §2 item 5 extends it to the game
  level.
- **The voiced corpus + weakness spine + the audit harness** (3-instrument,
  muted, vacuity-checked). *Buys:* hand-authored exact-position teaching where
  it exists, and a way to prove every wire fires.

### 1a. Verified inventory (grep/read 2026-09-15 — cite the file before claiming a gap)

| Capability | Where | State |
|---|---|---|
| One concept engine — line → named concept + invariant | `conceptEngine.conceptForLine`, `tacticInvariant` | shipped |
| One tactic classifier | `missedTacticService.detectTacticType`, `tacticVocabulary`, `tacticTypeUnification.test.ts` | shipped 2026-09-15 |
| Landed-tactic beat spoken mid-lesson | `dnaLineNarrator.landedTacticTeaching` ← `openingGenerator.ts:~2396` | shipped; proven on prod |
| Position assessment | `positionFacts` (+ criticality, mustDefend, leansOn, deliberation, latentDanger, kingExposure, opponentIntent, structurePlan, concession, backwardLook, positionalRead) | shipped |
| Piece quality / outposts / open files / development / castled king | `positionalRead.ts`, `boardConcepts.ts` | shipped — NOT a gap |
| Positive prophylaxis | `groundedAnswer.describeThreatPrevention` | shipped — NOT a gap |
| Engine alternatives weighed, spliced into Watch | `deliberation.deliberationAlternativesFacts` ← `openingGenerator.ts:2331–2448` | shipped |
| "Why not just take?" refutation on opening dives | `reviewOpeningTheory.explainTemptingCapture` | shipped (capture-specific) |
| DB main move + % per ply, departure detection | `theoryDeparture`, `bookDepartureWeakness`, `bookDeparturePrecompute` | shipped |
| Engine-verified punish gems on the path | `openingFactChains` ← `punish-gems.json` | shipped (masterclass openings only) |
| Game-level review computers | `reviewTurningPoint` (rating-scaled, contested-gated), `reviewHinge`, `reviewStoryGame`, `endgameRecapService` | shipped — review is NOT purely ply-by-ply |
| Weakness → selector wire (live clauses) | `positionFacts.applyWeaknessBoost`; six surfaces feed `studentWeaknesses` | shipped (system-map note was stale; fixed) |
| Causal chain | `causalChain.ts`, `causalChainVoice.ts` | shipped |
| Chokepoint + importance + preferRaw | `coachApi.voiceFacts`, `narrationImportance`, `criticalityScan` | shipped |
| Audit harness | 3-instrument, muted, vacuity-checked, `DEGRADE=llm` | shipped |

## 2. What's missing, and what each fills

1. **The refuted-alternative computer.** DB sibling → engine cost + punishing
   line → concept name. *Fills:* the actual content of opening theory on quiet
   plies — "why this and not the natural move" — the biggest gap in what the
   coach can say, and the reason Watch/Learn feel like move-by-move description
   instead of teaching. **Verified:** ~70% of the parts exist (engine alternatives
   in `deliberation`, "why not take" in `explainTemptingCapture`, DB main move +
   % in `theoryDeparture`, gems in `openingFactChains`); the COMPOSITION does
   not — the HUMAN-popular alternative (DB sibling frequency, not just engine
   candidates) + its punishing line + the concept's name, for any ply, not only
   gem-mined masterclass openings.
2. **The game-level selector** `{thesis, moments[], chain}`. Reads the whole
   sequence once, ranks moments by criticality, links them with the causal
   chain, emits one package. *Fills:* the unit-of-teaching problem — every
   surface today narrates ply by ply; this is why review is long and why the
   coach never says what a game was about. **Verified:** review already computes
   turning points, the hinge and a story game; what it lacks is the THESIS and
   the rule that per-ply beats must serve the thread. Watch/Learn/Play have
   nothing game-level.
3. **The book-move rule.** Inside the DB book: one sentence for the opening,
   zero per move; the first deviation gets the refuted alternative. *Fills:*
   review's verbosity at its root, and the same rule shortens Watch. **Refined
   by the standard:** book plies are silent unless the student's computed NEED
   says otherwise (§3.2–3.3); this is what retires R2, and only together with
   the selector.
4. **The surface table** `Record<CoachSurface, {register, withholds}>`. *Fills:*
   "one coach, different tabs" enforced at compile time — a surface can differ
   in tense and what it withholds, nothing else. **Verified:** `CoachSurface`
   exists (`src/coach/types.ts:90`); no table; register is an ad-hoc field on
   `reviewMoveBriefing`.
5. **Weakness-aware ranking inside the selector.** Moments that match the
   student's own weakness tags outrank equal-criticality moments. *Fills:* the
   personalization loop — the thread bends toward your holes, which the unified
   classifier just made possible. **Verified:** exists at PLY level
   (`applyWeaknessBoost`); missing at the GAME level because the selector does
   not exist yet.
6. **A coverage number.** Plies with ≥1 computed fact passing importance, by
   computer, gated like `teachingCoverage`; audits assert N computed beats per
   lesson/review. *Fills:* "stronger" becomes measurable per push instead of a
   feeling. **Refined by the standard:** measured against NEED — every ply whose
   need cleared threshold got a why, and no ply below it spoke.
7. **Plan memory** (found while verifying). `structurePlan` is re-derived per
   position; nothing carries "the plan announced at move 12" forward, so beats
   can repeat or contradict it. *Fills:* "still the same plan — and now the rook
   joins it."

**Order to build: 2 → 3 → 1 → 4 → 5 → 6** (David's endorsed order). The selector
first, because it decides when anything speaks; the alternative computer second,
because it's most of what gets said; the table and weakness ranking ride on top;
the number keeps us honest. Plan memory (7) rides with 1. §4 maps this to phases.

## 3. The design

### 3.0 The four invariants — the architecture this whole plan hangs on (David 2026-09-15: "One unified coach, whose abilities are the same no matter where in the app you are"; "this is actually where we started")

- **One selector.** The game-level reader (`{thesis, moments[], chain}`) is a
  single function. It takes a move list — a finished game, a taught line, a live
  game so far — and it doesn't know which surface called it.
- **One fact-computer set.** Landed tactic, refuted alternative, setup/threat,
  structure→plan, criticality, causal chain — each exists once, in
  `src/services/`, and the selector is the only thing that calls them for
  narration.
- **One chokepoint.** The package goes through `voiceFacts`; the model phrases,
  never chooses.
- **Surfaces differ in exactly two things, both declared not coded per surface:**
  register (review = retrospective "you played / they slipped"; watch/learn =
  present tense; play = silent until phase transition or asked) and withholding
  (review's honesty contract asks "where did it turn?" before the reveal; watch
  just tells you). Same brain, same abilities, different tense and timing.

The compile-time way to hold that: one `CoachSurface` union → one
`Record<CoachSurface, {register, withholds}>` — a new surface fails to build
until it declares both, and nothing else about the surface is allowed to differ.
The runtime way to hold the second invariant: a source-scan gate that FAILS when
any surface file calls a fact-computer for narration directly instead of through
the selector (N4's gate), so the five-computers drift cannot reopen.

### 3.1 The selector (one function, surface-blind)

```
selectTeaching(seq: MoveSeq, student: StudentModel, surface: CoachSurface): TeachingPackage
TeachingPackage = { thesis: Fact; moments: Moment[]; chain: CausalChain; beats: PlyBeat[] }
```
- Input is a move list + per-ply analysis (finished game, taught line, or the
  live game so far). It does not know which surface called it.
- Moments = `reviewTurningPoint` candidates (rating-scaled, contested-gated)
  ∪ landed tactics ∪ must-defend threats, ranked; cap 3.
- Chain = `causalChain` over the moments.
- Thesis = computed from the top moment + chain (the same fact-computers; a
  template in DNA register; the model phrases).
- Beats = per ply, ONLY where `need(ply) ≥ threshold` or the ply is a link in the
  chain. Everything else is silent.

### 3.2 The need score (per ply, per student)

```
need = w1·bookDepartureHere + w2·weaknessMatch(concept(ply), spine, lifecycle)
     + w3·(1 − familiarity(line, student)) + w4·openingResultDeficit
     + w5·onCausalThread
```
- `bookDepartureHere`: `bookDepartureWeakness` — the student's habitual departure
  ply in this opening is where the lesson is.
- `weaknessMatch`: `applyWeaknessBoost`'s matcher, applied to the ply's concept.
- `familiarity`: correct repetitions of this exact line by this student (SRS
  decay — five right → silent).
- `openingResultDeficit`: the student's score in this opening/variation vs their
  overall score.
- Cold start (< 5 games): prior = rating band; data takes over as it arrives. A
  fresh install never meets a mute coach.
- Need is the STUDENT term of the existing importance filter (unified-coach P1
  `userImportance`), not a second gate. Threshold reuses `criticalityThresholds`.

### 3.3 The book-move rule (a consequence, not a separate rule)

Inside the DB book the opening gets ONE beat (name + the plan it commits to).
Book plies speak only when need clears threshold. The first departure from book
gets the refuted-alternative beat. This is what retires R2 — together, never
separately (CLAUDE.md standard).

### 3.4 The refuted alternative (the computer)

```
refutedAlternative(fenBefore, taughtSan, student): { alt: San; games: n; pct;
  costCp; line: PvLine; concept: ConceptId | null } | null
```
- `alt` = the most-played DB sibling ≠ taught move (`findContinuationsAtPly` /
  masters explorer frequencies; gems when present).
- cost + line from the engine (`computePvLine` after `alt`), graded at the quiet
  end (the gem doctrine's playout rule).
- concept = `conceptForLine(line)`; null when the punishment is positional —
  then say the cost, never invent a motif.
- Fires when `costCp` clears the rating band AND (need ≥ threshold OR it is the
  student's own departure). Baked at generation time for Watch/Learn (engine at
  gen; `WALKTHROUGH_GEN_REV` bump → expect a TTS re-synth bill, batch it).

### 3.5 The surface table

```
const SURFACE_CONTRACT: Record<CoachSurface, { register: 'retrospective'|'present'|'silent'; withholds: 'thesis-until-answer'|'none' }>
```
review = retrospective + withholds thesis until the student answers "where did
it turn?" (the honesty contract); teach/watch/learn = present + none; play =
silent (phase transitions only) + none; chat/hint = present + none. A new
surface fails to compile until declared. NOTHING else about a surface may differ
in what the coach knows or says.

### 3.6 Plan memory

`PlanState` carried through the sequence: the plan announced at ply k persists
until the structure changes (`structurePlan` returns a different plan) or the
game leaves the phase; subsequent beats reference progress against it instead of
re-announcing.

## 4. Phases (each = one push to `main` + its audits; David's order 2 → 3 → 1 → 4 → 5 → 6)

| Phase | Build | Gate (unit) | Audit (prod, muted, 3-instrument) |
|---|---|---|---|
| **N0 — DONE 2026-09-15** (`tacticTypeBackfill.ts`, per-row `tacticTypeRev`, wired detached in `dataLoader.runSeedOnce`; gate `tacticTypeBackfill.test.ts` 7/7 in ship-check; SHIPPED f1669f5 → prod bundle `ukDnA-jx`; prod probe `audit-tactic-type-backfill-prod.mjs` 10/10 — the wire fires on a seeded device, idempotent, silent; `audit-weaknesses` 21/21, `audit-mistakes-quality-loop` 46/46) — backfill persisted `tacticType` rows onto the unified classifier (David 2026-09-15: "your call" → do it, before N5) | A versioned boot-time reconcile (`TACTIC_TYPE_REV`, the `PRO_DATA_REVISION` pattern — NO Dexie schema bump): rows in `mistakePuzzles` / `classifiedTactics` behind the rev get `tacticType` recomputed from stored `fen` + best move (+ PV where stored) via `detectTacticType`; idempotent, background, chess.js-only; rows missing inputs keep their tag and are flagged, never guessed. Why first: the retired geometry classifier mis-tagged exactly the cases that matter (hanging forker, clearance false positives) and those tags are the weakness spine N5 will steer toward | fake-indexeddb test: seed legacy-tagged rows → recompute → spine cluster ids reflect the unified tags; rows without inputs untouched | `audit-weaknesses`, `audit-mistakes-quality-loop` (tags on cards match the engine) |
| **N1 — the selector (item 2) — BUILT 2026-09-15, shipping** (`teachingSelector.ts`: `selectTeaching` / `renderThesis` / `pliesFromSans` / `selectTeachingForSegments` / `summarizeTeaching`; moments = `turningPointCandidates` (now exported from `reviewTurningPoint.ts`, rating-scaled + contested-gated — the review card and the selector share ONE computation) ∪ `landedTacticTeaching`; thesis turned/landed/plan/none. Wires: review reveal speaks the retrospective thesis AFTER the pick (`turningThesisRef`); play `usePhaseNarration` speaks the present thesis after the corpus note (only turned/landed — the plan kind is a `line`-only thesis, so no duplicate of the phase's own structure line); teach `tree.teaching` on every generated tree (Watch renders it in N3). Gates: `teachingSelector.test.ts` 8/8, `usePhaseNarration.test.ts` thesis pair, ship-check. Audits updated to the new contract BEFORE running: `audit-review-real-game` THESIS spoken-once-at-reveal + withheld-until-pick; `audit-teach-on-topic-prod` tree.teaching generated-this-run) | `selectTeaching(seq, student, surface)` over the existing computers: thesis + ≤3 moments + causal chain; per-ply beats gated on `onCausalThread`. Wired to review, Watch/Learn, Play phase-transitions and Learn live commentary in the SAME phase (they already share the fact-computers; one selector, surface-blind) | `selectTeaching.test.ts` on 3 real games + 2 taught lines: thesis computed, ≤3 moments, chain links them, identical package regardless of `surface` | `audit-review-real-game` R1/R3 green + NEW: thesis spoken once, moments ≤3; `audit-teach-on-topic-prod`; `audit-coach-play`; full-game workflow |
| **N2 — need + the book-move rule (item 3, the standard) — BUILT 2026-09-15, shipping** (`needScore.ts`: `computeNeed` — bookDepartureHere 35/55 + weaknessMatch ≤55 (via `matchTacticPattern`/`matchClauseKind`+`boostFor`) + unfamiliarity ≤25 (`FAMILIAR_REPS`=5 decay) + openingResultDeficit ≤40 + onCausalThread 35, bar 50; cold start <5 analysed games → rating-band prior 70/62/55/50 — every band TEACHES. `studentNeedLoader.ts` builds the context once per game from Dexie (analysed-game count, signals, cached book departures, line reps from the student's own annotated games, opening vs overall score). Selector: `SelectorInput.student` → `TeachingPackage.needByPly`; `TreeTeaching.needPlies`. Review: `buildReviewSegments(..., studentNeed)` gates the quiet per-move opening beat on `need.speak` and stamps `segment.need`; `generateReviewNarration` loads the context and emits `review-need-coverage` (per-ply rows) — the audit's instrument. `REVIEW_NARRATION_REV` 2→3. R2 RETIRED in `audit-review-real-game` → NEED coverage-rows-captured / owed-plies-narrated / silent-where-not-needed. DEVIATION from §3.2: the bar is a fixed 50 on a 0–100 scale, NOT `criticalityThresholds` (that bar is in cp and GROWS for weaker players — a beginner would need more evidence to be taught; backwards). Teach/Watch gating rides N3's gen-rev bump (the beats are baked). Gates: `needScore.test.ts` 11, `reviewNeedGate.test.ts` 4) | Need score (§3.2) + cold-start prior wired as the student term of importance; book plies silent unless need clears; opening = one beat; **retire R2** in `coachFeatureService` ("teach every silent opening move") AND the audit rubric in the SAME push | need-coverage gate: every ply with need ≥ threshold has a why, none below; cold profile → teaches; seeded weakness profile → teaches at its holes; mastered line → silent | `audit-review-real-game` with R2 replaced by need-coverage, run twice (cold + seeded via `seed-weakness-profile.mjs`); `audit-concept-gameplay-prod` |
| **N3 — the refuted alternative + plan memory (items 1, 7) — BUILT 2026-09-15, shipping** (`refutedAlternative.ts`: `refutedAlternative({fenBefore, taughtSan, candidates, studentColor, rating})` → `{alt, games, pct, costCp, line, concept, lineSans, text}` — candidates from the masters DB (`candidatesFromMasters(mastersMovesSync(fen))`), cost from two `computePvLine` reads graded at the quiet end only when the line DELIVERS, concept from `conceptForLine` on the punishing line read from the opponent's seat (tactic/mate sources only → positional = null, cost-only text); fires only when the cost clears `criticalityThresholds.notable`. Baked in the generator on the student's first-12 plies WHERE NEED CLEARS (the student context loaded at gen), as beat two behind the note / authored prose, ahead of the generated aside and the plain weighing; `tree.teaching.refuted[]` carries the facts. `planMemory.ts`: `foldPlans` / `stepPlan` — a plan is announced once and carried until `structurePlan` changes; `TeachingPackage.planByPly`. ONE gen-rev bump: `WALKTHROUGH_GEN_REV = 2026-09-15-refuted-alternative-need-selector` (expect a TTS re-synth bill). Review's departure refutation: NOT added here — the review already speaks the engine's punishment line on the student's flagged move (the 2026-07-21 "how does this mistake get taken advantage of" beat); wiring the DB-popular framing there is a later pass, not a gap in the computer. New audit `audit-refuted-alternative-prod.mjs` (Ponziani — a DB-generated Tier-3 ask; static/voiced trees carry no baked beat by design). Gates: `refutedAlternative.test.ts` 6, `planMemory.test.ts` 4) | `refutedAlternative()` (§3.4) → beat in Watch/Learn (gen-time bake, one `WALKTHROUGH_GEN_REV` bump) and in review at the student's first departure; `PlanState` carried across plies (§3.6) | `refutedAlternative.test.ts` (DB sibling chosen, cost graded at the quiet end, concept from the engine, positional → null); plan announced once per structure | `audit-concept-gameplay-prod` + "a refuted-alternative beat was SPOKEN"; live `narrationAccuracy` on every spoken line; `audit-teach-on-topic-prod` no repeated plan announcements |
| **N4 — the surface table (item 4) — BUILT 2026-09-15** (`src/coach/surfaceContract.ts`: `SURFACE_CONTRACT: Record<CoachSurface, {register, withholds, speaks}>` — review = retrospective + thesis-until-answer; teach = present; phase-narration (Play) = present + transitions-only; chat/hint/search = present + on-request. `registerFor(surface)` is what the review + phase-narration call sites read; no literal register anywhere. Gate `surfaceContract.scan.test.ts`: exhaustive vs the `CoachSurface` union (parsed from source), no `renderThesis(x,'<literal>')` outside the selector, components/hooks call the fact-computers directly ≤ 1 (shrink-only baseline: `CoachTeachPage` `buildCausalChain` for the live-commentary chain — route it through the selector to lower the ceiling to 0)) | `SURFACE_CONTRACT: Record<CoachSurface, {register, withholds}>`; every surface reads register/withholding from it; nothing else per-surface | compile-time exhaustiveness test; a source-scan gate fails any surface file that calls a fact-computer for narration directly (the selector is the only caller — invariant 2) or carries register/withholding logic outside the table | review/teach/play audits unchanged in outcome |
| **N5 — weakness-aware moment ranking (item 5) — BUILT 2026-09-15** (inside `selectTeaching`: swing candidates re-sorted by `swingPawns·100 + boostFor(matchTacticPattern(landedTactic, student.signals))` — the same 0–30 boost positionFacts applies, in centipawns, so it re-orders COMPARABLE swings and never vaults a subtlety over a blunder; landed-tactic fill order = the student's holes first, then game order; empty profile → identity, so the review card and the selector still agree on the biggest swing) | moments matching the student's weakness tags outrank equal-criticality moments inside the selector (extends `applyWeaknessBoost` to the game level) | seeded profile changes the thesis/moment order deterministically | `audit-unified-coach-prod` |
| **N6 — the number (item 6) — BUILT 2026-09-15** (`needCoverage.report.test.ts` → `audit-reports/need-coverage.json`: over the 43 repertoire main lines (first 16 plies, one selector read per line, then `computeNeed` per profile) the share of the student's plies taught — cold 100% (FLOOR ≥ 99%, never a mute coach), mastered line 0% (CEILING ≤ 2%, shrink-only), seeded fork+pin holes on a mastered line 2%, warm student on a never-seen line 100% (unfamiliarity alone is a need — the bar exactly, decaying per correct rep). One number per profile is the number for every surface (the selector is surface-blind; surfaces differ in register only). In ship-check.) | need-coverage per surface per profile → `audit-reports/need-coverage.json`, shrink-only ceilings | report test | — |

Sequencing logic: the selector first because it decides WHEN anything speaks;
need + R2 retirement second because the loudest new sentence (the alternative)
must be born gated; the alternative third because it is most of WHAT gets said;
the table, ranking and number ride on top. R2 retires inside N2 only — never
before the selector exists, or the July silence returns.

## 5. Decisions log

- 2026-09-15 David: the unit is the GAME, not the move ("master level puzzle").
- 2026-09-15 David: one coach, identical abilities on every surface; tabs keep
  register/subtleties only.
- 2026-09-15 David: improve all surfaces simultaneously (cost accepted: review +
  teach + play audits on every push of this build).
- 2026-09-15 David: narration selected by DATA-computed need → app standard
  (CLAUDE.md). R2 retired with the selector, not before.
- 2026-09-15 open for David: does review WITHHOLD the thesis until the student
  answers "where did it turn?" (honesty contract) or open with it like a
  master's first line? Plan assumes withhold; flip `SURFACE_CONTRACT.review`.
- 2026-09-15 DECIDED (David: "your call"): backfill persisted `tacticType` rows
  onto the unified classifier — YES, as N0 (versioned boot-time reconcile, no
  schema bump), before N5 so weakness-aware ranking never steers toward the old
  classifier's mistakes.
- Not requested: iOS/OTA build. `main` = free web app only.

## 6. Mistakes this session made that the next must not repeat

- Claimed piece quality, tempo ledger and positive prophylaxis were missing —
  all exist (see §1). Grep before claiming a gap.
- Claimed review "reads nothing at game level" — it has turning points, hinge,
  story game. The gap is the thesis + the serve-the-thread rule.
- Wrote an illustrative "Nf3 not Nc3 … fork on d4" sentence from memory and let
  it read as computed. It was not. Every shipped sentence comes from the DB,
  the engine and the concept engine (G3/G0).
- The gameplay audit matched an exact invariant sentence; the phrasing pass
  rewords computed beats. Match on substance (name + engine cue, pinned to the
  engine by `auditConceptGameplayCues.test.ts`), scope lines per ask, give
  playback its own clock, answer forks and pickers like a student.

- **`npx tsc --noEmit` is NOT the project's typecheck.** ship-check runs
  `npm run typecheck` = `tsc -b --force`, and only that caught a duplicate
  `assessPositionalEdge` import that `--noEmit` passed clean. It cost a full
  ship-check cycle (~10 min). Verify with `npm run typecheck`, never `npx tsc`.
- **Narration is non-deterministic under CPU load, by design.** Every engine
  read is `raceTimeout(computePvLine(…), PROJ_TIMEOUT_MS = 7000, null)` — a
  wall-clock deadline, not a length cap — so on a busy box a beat silently
  vanishes rather than blocking the walk. This bit twice on 2026-09-16: two
  `coachFeatureService.causalChain` tests "failed" purely from contention with
  a concurrent ship-check (both pass alone), and the review audit's REOPEN row
  went red the same way. **When a beat is missing from an audit or a test, load
  is the first suspect, not the code** — re-run it alone before diagnosing.
  Corollary: never run a heavy Playwright audit and ship-check at once.

## 6b. Open findings after the N0–N6 build (2026-09-15)

- `audit-review-real-game.mjs` is STALE since the 2026-09-05 overhaul (reads
  "Ply 0/0"; every rubric row false-fails). The living review audit is
  `audit-review-overhaul-prod.mjs` (carries THESIS + NEED now). Resurrect or
  delete the old one — do not trust a red from it.
- `audit-review-overhaul-prod` on the N1 bundle: 2 reds — REOPEN not startable
  within 25s and the after-dive fixture ply unreached (a consequence). The run
  shared the sandbox CPU with ship-check + lint + vitest (the page's 4 Stockfish
  workers starved). Re-run on an idle sandbox after the N2–N6 deploy before
  calling it a product regression; if it stays red, the reopen regen path is
  the suspect (`REVIEW_NARRATION_REV` 3 invalidates every cached walk once).
- `audit-coach-play-gaps.mjs` (first ever run): moves did not register via its
  square-click driver while `audit-coach-play.mjs` played the same moves fine —
  a harness defect in the gaps script, not the surface.
- `CoachTeachPage` still calls `buildCausalChain` directly for the live
  commentary chain (the scan gate's baseline of 1). Route it through the
  selector to lower the ceiling to 0.
- Review's book-departure beat does not yet carry the DB-popular framing of the
  refuted alternative (the engine punishment line is already spoken there).

### N2 CORRECTION (2026-09-15, same day) — the gate was on the wrong branch

N2 shipped the book-move gate on the CAPPED cascade. `isReviewUncapped()`
returns TRUE by default (`CoachGameReview.tsx:104-114`), so the branch a real
review runs is the full-data aggregator, and it was ungated: every quiet
opening ply still emitted the whole computed inventory. Every N2 assertion was
green because `reviewNeedGate.test.ts` also passed `uncapped=false` — a gate
that only covers the path nobody runs. Fixed in `fix(review): the narration
defects a real prod transcript exposed`; the test file now carries three
uncapped cases. When you gate a review behaviour, gate the UNCAPPED path first
and the capped one second.

## 6c. READING THE ACTUAL NARRATION (David 2026-09-15: "Fire does not equal green. Show me the narrations as well")

A pass count is not a read. The method that found six real defects in one
sitting, and the method every future narration change owes:

1. Take a REAL game (David's Alapin, the review audit's fixture PGN).
2. Get REAL per-ply evals + classifications: drive the bundled engine
   (`node_modules/stockfish/bin/stockfish-18-lite-single.js`) over every ply
   from a throwaway node script, white-POV normalised, and write the
   `ReviewMoveInput[]` to JSON. ~46 plies at depth 14 takes about a minute.
3. Call `buildReviewSegments(moves, 'black', openingName, /* uncapped */ true,
   rating, [], need)` from a throwaway vitest file, strip the `[tags]`, and
   PRINT every line next to its ply, classification and need score.
4. Run it TWICE — once with a cold student (no `studentNeed`), once with a
   warm mastered profile (`lineReps` = FAMILIAR_REPS) — and read both.
5. Delete the throwaway file; keep the defects as tests built on the REAL
   FENs the game produced (`reviewNarrationDefects.test.ts`).

What that read produced (all six fixed in `fix(review): the narration defects
a real prod transcript exposed`): the uncapped default path was never
need-gated; the structure inventory was spoken as machine atoms with a colour
instead of a seat; "inaccuracy move (eval swung 0.4)"; a projected line said
"their position" about the student's own camp; two copies of the
worst-placed-piece loop with the gates on only one (a reroute plan offered on
the ply a check-fork landed, and the same knight called both an outpost and
the worst piece); and the outpost stated twice on one ply by two computers.

Still open from that read, not yet fixed:
- "The move walks away from your pawn on X — no defender left" fires on ~12 of
  46 plies. Each instance is a different piece, so it is not a verbatim repeat,
  but the STEM is a recording. Rotate the stem or raise its bar.
- Ply 38: the move is classified an inaccuracy AND gets a sacrifice-compensation
  read in the same beat. Both are board-true; the beat should pick one frame.
- Ply 46: "you own the open c-file" and "the plan is to seize the open d-file"
  in one breath, on the move that took the c-file.

## 7. Next-session pickup

Read CLAUDE.md standard + this doc + `docs/coach-system-map.md` §4. Start at N1.
Do not rebuild anything in §1. Every phase: ship-check → push `main` → bundle
hash advanced → the phase's audits on prod (muted) → vacuity check on any edited
audit → report in three lines.

## 8. N7 — THE EXCHANGE LEDGER: who won what, across a line (David 2026-09-16: "Now is the time for it")

### The find (surface map, 2026-09-16)

David asked why the fixed ply gave no plan. Chasing that produced a bigger
defect than the missing plan, in the sentence the review DOES speak there.

`augmentWithProjections` pass #3 already runs on BOTH sides' mistakes and
frames the opponent's as **"Here's how you take advantage: …"**. It fires at
ply 29 of David's Alapin (Nc7+, the opponent's mistake, −1.8). What it renders,
verified by running `narrateDnaLine` on the real line:

> Here's how you take advantage: Kxd7, **winning the knight**, the king trains
> on the knight on c7 — pressure they have to answer, then Nxa8, **winning the
> rook**, the knight reaches into your half…, Nexd4, **winning the pawn**, …

Three captures, phrased identically, **none attributed**. Two are the
student's; the middle one is the OPPONENT taking the student's rook. Under a
heading that says "here's how YOU take advantage", a student reads "winning the
rook" as their own gain. It is the precise complaint the app's most engaged
real user wrote in feedback: *"I have a hard time understanding if they are
talking about me or the opponent."*

And the sentence that would settle it — the NET — does not exist anywhere:
*you take the knight, they take the rook back, you come out with two knights
for the rook, which is why the engine still calls the fork a mistake.*

### Correction to what was said earlier this session

Reported to David as "no computer produces that sentence today". Half wrong:
the punishment LINE exists and fires. What does not exist is per-move
attribution inside it and the net ledger over it. Stated here so the next
reader does not inherit the wrong premise.

### The build

**N7a — attribute every capture in a projected line.** `dnaMoveClause` already
knows `mv.color` and (since 2026-09-15) the student's colour. A capture clause
becomes seat-stamped under the one perspective law: the student's captures read
"you win the …", the opponent's "they take the … back". Never a subjectless
"winning the rook" in an alternating line.

**N7b — `exchangeLedger.ts`, a new pure computer.** `computeExchangeLedger(
fenBefore, sans, studentColorWB)` walks the line with chess.js and returns what
each side captured, plus `describeExchange()` → the human sentence in piece
names, never raw points: "you come out with two knights for the rook". Null
when nothing is exchanged, or when the line is a clean one-sided win (the line
already said it — Narration Voice Rule 3, don't restate the picture).
NB there are already FOUR `materialBalance` exports plus two `countMaterial`s
in `src/services` (conceptEngine, materialClaimValidator, narratedContinuation,
gamePhaseService, positionReadingService, boardUtils) — none of them is a
ledger over a SEQUENCE, so this is not a fifth copy of the same thing. The
duplication is real rot and is logged in §6b as its own sweep; do not fold it
into this build.

**N7c — wire it to every projection, not to ply 29.** `render()` in
`augmentWithProjections` appends the ledger to any spoken line that exchanges
material on both sides. That covers the punishment pass, the better-line pass
and the threat pass at once — one computer, every caller, per invariant 1.

### Gates

`exchangeLedger.test.ts` on the REAL boards this came from: the ply-29 Alapin
line nets two knights for the rook; a clean one-sided win returns null (no
restatement); an even trade returns null; a line where the student LOSES on net
inside an "advantage" frame is reported from the student's seat. Plus a case in
`reviewNarrationDefects.test.ts` proving no subjectless "winning the …" survives
in an alternating line.

### Audit

`audit-review-overhaul-prod.mjs` — read the spoken text at the forked ply and
assert the net sentence is present and seat-correct. Per David 2026-09-15, the
audit reads the NARRATION, not a pass count.

### N7d — ONE VERDICT COMPUTER (David 2026-09-16, reading the shipped line:
"Why is the user clearly better? That sentence is missing")

Two verdict computers existed over the same eval bands:

| | input | output |
|---|---|---|
| `augmentWithProjections.verdictWord` (private, now deleted) | cp | a word |
| `assessPositionalEdge` | cp + fen | `{verdict, reasons}` |

The per-move `[verdict]` facet always used the second ("You're clearly better:
you have the bishop pair"); the PROJECTED lines got the first, so they ended on
a bare "you're clearly better" — the eval bar read aloud, which the Narration
Voice Rules call filler and G0 calls voicing a number instead of a fact.

They also DISAGREED ON THE WORD. At +120 the projection said "you're clearly
better" while the per-move verdict on the same game said "you're a bit better".
One review, one number, two verdicts — the drift class, demonstrable inside a
single walk.

Fixed: `verdictWord` deleted; projected lines read `assessPositionalEdge` at the
line's TERMINAL position (the board the verdict is about, not the root) and
carry up to two ranked board reasons; no reasons → the word alone, never an
invented why. Gated by a source scan that fails if a second cp-to-word ladder
reappears in the projection code.

**This is the third duplicate-computer defect of the session** (the worst-piece
loop, the outpost stated twice, the verdict) and is the evidence behind §9.

## 9. N8 — TYPE THE FACT (David 2026-09-16: "this is not one cohesive computer")

Not yet built; David asked for thoughts, the answer is recorded here so the
next session does not re-derive it.

**The finding.** There are TWO fact representations in the app:
- `positionFacts` → `ClauseItem { kind, rank, text, conceptId }` — typed,
  ranked, concept-tagged. `applyWeaknessBoost` matches on `conceptId`, cleanly.
- `reviewFullData.computeMoveFacets` → `string[]` with ~30 bracket tags
  (`[verdict]`, `[structure]`, `[worst]`, …). Every consumer reverse-engineers
  structure back out of prose: `standingSig` strips words by regex,
  `freshStructureFacet` splits on `' · '`, highlights are coupled through a
  `Map` keyed on the facet STRING (with a comment warning that a later rewrite
  breaks the key), and the 2026-09-15 outpost dedupe greps `/outpost/i` plus
  `\b[a-h][1-8]\b` out of a sentence to ask what another computer said.

Every narration defect found on 2026-09-15/16 lived in the prose representation.

**What NOT to do.** Merge the detectors. That loses the ~200 board-truth tests
that are the only reason the narration is trustworthy, and it makes the
synchronous corpus lookup (90% of what gets said) wait behind 7s-budgeted
engine reads. The spine (selector, surface table, `voiceFacts`, `positionFacts`)
already exists — every defect was code that BYPASSED it.

**The build.** Make the review's facets `ClauseItem[]` and give `ClauseItem` the
three fields whose absence caused this session's bugs, each killing a class by
construction rather than by patch:
- `subject` — whose piece. Kills "a highway into their position" about the
  student's own camp, and "winning the rook" with no owner. Seat decided ONCE.
- `squares` — kills the string-keyed highlight map.
- `claimId` (e.g. `outpost:d4`) — kills one fact stated twice. Structural, not
  regex.

Then ONE renderer owns dedupe, seat-stamping, importance ordering and the N2
need bar; the detectors stay small, pure and separately gated, and stop writing
English. Scope v1 to REVIEW end to end — that is where the prose ledger lives
and where every defect was — not all surfaces at once.

### Explicitly NOT in this build

The missing forcing PLAN in `deriveNextPlans` (eight plans, all assuming a
quiet board). With the ledger speaking the net, ply 29 teaches correctly
without one. Whether a ninth plan is still owed is a judgement to make after
reading the shipped output, not before.
