# One Coach — the need-based selector, the game as the unit, the refuted alternative

**Status:** plan, committed before code (2026-09-15). Supersedes nothing; it is the
next build on top of `docs/plans/2026-09-08-unified-coach.md` (the four-layer
blueprint) and `docs/plans/2026-09-14-computed-concept-detectors.md` (P1–P5
shipped, P6 core landed). Read both plus `docs/coach-system-map.md` before code.

**The standard it implements:** CLAUDE.md → "NARRATION IS SELECTED BY THE
STUDENT'S COMPUTED NEED — the app standard (David 2026-09-15, LOCKED)".

---

## 0. Where we want to be (David's picture, restated)

One coach, one brain, everywhere in the app. Hand it any sequence of moves — a
finished game, a taught line, the game being played right now — and it reads it
the way a master reads a position handed to him cold: it names what the game is
**about**, finds the one to three moments it turned on, links them into a thread,
and says only that. It knows what *this* student keeps getting wrong and bends the
thread toward it. Every word traces to something computed (a DB frequency, an
engine line, a concept with an invariant, the student's own record); the model
only phrases. The tabs differ in tense and timing, never in intelligence. A book
move gets no sentence unless the data says this student needs it. A quiet move
gets no sentence. The coach's silence is as computed as its speech.

David, verbatim, the constraints:
- "I want the coach to view each game like a master level puzzle. Not each move."
- "This is one computer not 5 separate ones … One unified coach, whose abilities
  are the same no matter where in the app you are."
- "I do not like review. It takes too long and says too much in opening book
  moves."
- "My hope is that these builds improve narrations throughout the entire app
  simultaneously … while maintaining the individuality … The retrospective
  narrations, the subtleties remain while what the coach says improves."
- "Make it algo based. Narrate where the data tells us the user needs
  narration/teaching." → the app standard.

## 1. What we have (VERIFIED against the code 2026-09-15 — do not re-derive)

A session (this one) asserted gaps that turned out to exist. Each row below was
grepped/read; cite the file before claiming otherwise.

| Capability | Where | State |
|---|---|---|
| One concept engine — line → named concept + invariant | `conceptEngine.conceptForLine`, `tacticInvariant` | shipped; speaks on puzzles, drills, hints, review facets, live Learn |
| One tactic classifier (weakness tag = projection of the engine) | `missedTacticService.detectTacticType`, `tacticVocabulary`, gate `tacticTypeUnification.test.ts` | shipped 2026-09-15 |
| Landed-tactic beat spoken mid-lesson | `dnaLineNarrator.landedTacticTeaching` ← `openingGenerator.ts:~2396` | shipped; proven on prod (`audit-concept-gameplay-prod.mjs` 8/8) |
| Position assessment | `positionFacts` (importance, criticality, mustDefend, leansOn, deliberation, latentDanger, kingExposure, opponentIntent, structurePlan, concession, backwardLook, positionalRead) | shipped |
| Piece quality / outposts / open files / development / castled king | `positionalRead.ts` (best-placed piece + "trade it off", development read), `boardConcepts.ts` | shipped — NOT a gap |
| Positive prophylaxis ("your move prevented…") | `groundedAnswer.describeThreatPrevention` | shipped — NOT a gap |
| Engine alternatives weighed, spliced into Watch | `deliberation.deliberationAlternativesFacts` ← `openingGenerator.ts:2331–2448` | shipped |
| "Why not just take?" refutation on opening dives | `reviewOpeningTheory.explainTemptingCapture` | shipped (capture-specific) |
| DB main move + % at each ply, departure detection | `theoryDeparture` (masters DB), `bookDepartureWeakness`, `bookDeparturePrecompute` | shipped |
| Engine-verified punish gems on the path | `openingFactChains` ← `punish-gems.json` | shipped (masterclass openings only) |
| Game-level review computers | `reviewTurningPoint` (rating-scaled, contested-gated), `reviewHinge`, `reviewStoryGame`, `endgameRecapService` | shipped — review is NOT purely ply-by-ply |
| Weakness → selector wire (live clauses) | `positionFacts.applyWeaknessBoost`; fed by teach, play, phase narration, live coach, position read, opening play | shipped (system map note "no studentWeaknesses field yet" is STALE — fixed in this commit) |
| Causal chain (cross-move cause→effect) | `causalChain.ts`, `causalChainVoice.ts` | shipped |
| The chokepoint + importance filter + preferRaw | `coachApi.voiceFacts`, `narrationImportance`, `criticalityScan` | shipped |
| Audit harness | 3-instrument, muted, vacuity-checked, `DEGRADE=llm` | shipped |

## 2. What is missing (VERIFIED) — and the sentence each unlocks

1. **The game-level selector** `{thesis, moments[], chain}` — reads the whole
   sequence once. Review has turning points + hinge but no THESIS and no rule that
   per-ply beats must serve it; Watch/Learn/Play have nothing game-level.
   *Unlocks:* "This game was decided by the …c5 break you never played." — and
   the silence everywhere else.
2. **Need-based narration selection** (the standard). Nothing today asks "does
   THIS student need THIS ply." Review narrates every good opening ply by rule
   (R2); Watch narrates every ply of the lesson.
   *Unlocks:* review that is short for David and full for a 900 who has never
   seen …c6; a mastered lesson that replays shorter.
3. **The refuted alternative, composed for any ply** — the HUMAN-popular
   alternative (DB sibling frequency, not just engine candidates) + its engine
   cost + punishing line + the concept's name. Pieces exist (row table above);
   the composition does not, and gems cover masterclass openings only.
   *Unlocks:* "Book is Nf3 here, not Nc3 — after Nc3 the …c5 break hits d4 and
   the fork on d4 wins a pawn" (illustrative FORM only — every word of the real
   sentence comes from the DB, the engine and `conceptForLine`; never from
   memory — G3).
4. **Plan memory** — `structurePlan` is re-derived per position; nothing carries
   "the plan announced at move 12" forward, so it can repeat or contradict.
   *Unlocks:* "still the same plan — and now the rook joins it."
5. **The surface table** `Record<CoachSurface, {register, withholds}>` —
   `CoachSurface` exists (`src/coach/types.ts:90`); register is an ad-hoc field
   on `reviewMoveBriefing`. *Unlocks:* one coach whose tabs cannot drift apart.
6. **A need-coverage number** — coverage measured against need, per user, per
   surface; replaces R2 in the audits.

## 3. The design

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

## 4. Phases (each = one push to `main` + its audits; order is load-bearing)

| Phase | Build | Gate (unit) | Audit (prod, muted, 3-instrument) |
|---|---|---|---|
| **N1** | Surface table (`SURFACE_CONTRACT`) + wire existing surfaces to read register from it | compile-time exhaustiveness test | `audit-coach-review`, `audit-teach-on-topic-prod`, `audit-coach-play` (no behavior change expected) |
| **N2** | Game-level selector over review's existing computers: thesis + moments + chain; per-ply beats gated on `onCausalThread` only (need not yet wired) | `selectTeaching.test.ts` on 3 real games (thesis computed, ≤3 moments, chain links them) | `audit-review-real-game` R1/R3 still green; NEW assertion: thesis spoken once, moments ≤3 |
| **N3** | Need score + cold-start prior; wire into importance as the student term; book-move rule; **retire R2** in `coachFeatureService` + the audit in the SAME push | need-coverage gate: every ply with need ≥ threshold has a why, none below | `audit-review-real-game` with R2 replaced by need-coverage; re-run with a seeded weakness profile (`seed-weakness-profile.mjs`) AND a cold profile |
| **N4** | Refuted-alternative computer + its beat in Watch/Learn (gen-time bake) and review (first departure) | `refutedAlternative.test.ts` (DB sibling chosen, cost graded at quiet end, concept from engine, positional → null) | `audit-concept-gameplay-prod` gains "a refuted-alternative beat was SPOKEN"; soundness of every spoken line (`narrationAccuracy` live) |
| **N5** | Plan memory | plan announced once per structure; progress beats reference it | `audit-teach-on-topic-prod` no repeated plan announcements |
| **N6** | Play phase-transition + Learn live commentary read the same selector (they already feed `studentWeaknesses`) | fires-for-real hook gates | full-game audit workflow green |
| **N7** | Coverage report: need-coverage per surface per profile → `audit-reports/need-coverage.json`, shrink-only | report test | — |

Sequencing logic: N1 first because it costs nothing and stops drift while the
rest lands. N2 before N3 because need without a thesis just re-thins the same
ply-by-ply walk. N3 before N4 because the alternative beat is the loudest new
sentence and must be born gated. R2 retires inside N3 only.

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
- 2026-09-15 open for David: backfill of persisted `tacticType` rows onto the
  unified classifier (Dexie migration) — not started.
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

## 7. Next-session pickup

Read CLAUDE.md standard + this doc + `docs/coach-system-map.md` §4. Start at N1.
Do not rebuild anything in §1. Every phase: ship-check → push `main` → bundle
hash advanced → the phase's audits on prod (muted) → vacuity check on any edited
audit → report in three lines.
