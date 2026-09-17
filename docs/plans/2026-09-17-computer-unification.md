# The computer unification — map, plan, execute

David 2026-09-17: *"I want you reading all the computers we have, make sure they
are unified"* → *"we need to complete the unification before anything else. map,
plan, exicute"*.

---

## §0 THE MAP (measured 2026-09-17, every number from the code)

### 0.1 The verdict

**The DECISION layer is unified. The FACT layer is not.** That is the inverse of
what you would guess, and it is because the N-series work this month unified the
door and stopped there.

The live composer (`positionFacts`) and the review composer
(`coachFeatureService`) share exactly **four** modules:

| shared | what it is |
|---|---|
| `coachDecider` | the one door (G4.5.15) |
| `methodBeat` | the habit beat |
| `needScore` | does THIS student need it here |
| `weaknessSignal` | the student model |

Everything below them is disjoint: 18 live-only deps vs 39 review-only.

### 0.2 The same job, computed twice

| the job | live | review | shared? |
|---|---|---|---|
| threats | `threatOut`, `opponentIntent` | `reviewOpponentCommentary` | ✗ |
| fundamentals | `moveFundamentals` | `principleAttribution` + `principleVoice` | ✗ |
| plans | `boardPlan` | `reviewStrategicOrientation` + `deriveNextPlans` | ✗ |
| concepts | `conceptEngine` | `reviewConcepts` | ✗ |
| positional read | positionFacts clauses | `reviewPositionalAssessment` | ✓ both on `boardStructure` |

Four of five are independent code paths over the same chess. That is why a fix
lands on one surface and not the other — #50 (seat), #55 (register) and #49
(concept invariant) were each "right in review, wrong live" or the reverse.

⚠️ **They are NOT naive duplicates — do not "merge the functions".** Reading the
exports: `computeMoveFundamentals` asks *what did this move achieve*, while
`attributePrinciples` asks *what did it violate*. `conceptEngine` renders a
concept from a detected pattern; `reviewConcepts` detects one from a review
context. The duplication is in the **vocabulary and the shape**, not the body.
The fix is the one that worked three times this session — `tacticVocabulary.ts`,
`perspectiveRule.ts`, `keySquares.ts`: ONE declared vocabulary, ONE shape, every
producer fills it.

### 0.3 🚨 THE SHARPEST INSTANCE — the positive half of the coach files under nothing

Two fundamentals vocabularies exist and they are the POSITIVE and NEGATIVE
halves of one axis:

| | vocabulary | members | reconciles to |
|---|---|---|---|
| negative | `FundamentalId` (principleAttribution) | **33** | `MisconceptionTagId` via `FUNDAMENTAL_TAG` ✅ |
| positive | `MoveFundamentalId` (moveFundamentals) | **10** | **NOTHING** ❌ |

`MoveFundamentalId` appears in exactly ONE file — its own. Its ten members
(`king-safety`, `outpost`, `development`, `center`, `open-file`,
`king-activity`, `passed-pawn`, `luft`, `space`, `prophylaxis`) pair almost
one-to-one with negatives that DO file under a weakness tag:

```
development   ↔ neglected-development / same-piece-twice / early-queen-sortie
king-safety   ↔ king-left-in-centre / weakened-king-shield
space         ↔ space-conceded
open-file     ↔ rook-ignored-open-file
passed-pawn   ↔ passed-pawn-neglected / rook-in-front-of-passer
king-activity ↔ passive-king-endgame
center        ↔ premature-centre-break / capture-toward-centre
prophylaxis   ↔ ignored-threat
outpost       ↔ worst-piece-unimproved      (weaker pairing)
luft          ↔ (none)
```

…and they never reconcile. This is precisely the rot CLAUDE.md opens with
(`TacticPatternType discovery` vs `TacticType discovered_attack`, where a
student's weakness silently never matched the live fact).

**The consequence, and it is a real coaching defect.** All ten positives collapse
into ONE `ClauseKind` — `'fundamental'`, rank 38 (`positionFacts.ts:798`). So:

* the coach can name what you did WRONG at **33** levels of resolution, and what
  you did RIGHT at **1**;
* doing the thing right is never recorded against the matching weakness, so a
  student who has fixed a hole gets no evidence of it in their own model.

### 0.4 The surface layer is worse — the page is a third coach

| surface | lines | direct `services/` imports |
|---|---|---|
| `CoachTeachPage` | **13,895** | **100** |
| `CoachGamePage` | 5,347 | 46 |
| `CoachGameReview` | 4,712 | 40 |

The three surfaces of "one coach" share **six** services — and four of those are
infrastructure (`voiceService`, `stockfishEngine`, `appAuditor`,
`gamePhaseService`). Only `liveTacticsContext` and `mistakePuzzleService` are
shared TEACHING. **75 computers are Teach-only.**

The page is not a surface consuming a coach. It is a third coach.

### 0.5 The vocabularies, and which reconcile

| vocabulary | home | reconciles to | ok |
|---|---|---|---|
| `MisconceptionTagId` | data/misconceptionTags.ts | THE SPINE | — |
| `FundamentalId` (33) | principleAttribution | MisconceptionTagId | ✅ |
| `ClauseKind` (13) | positionFacts | weakness via `matchClauseKind` | ✅ |
| `FacetTag` (34) | reviewFacetRank | ClauseKind via `clauseKindForTag` | ✅ |
| `TacticType` / `TacticPatternType` | types | bridged by `tacticVocabulary` | ✅ (fixed 2026-09-08) |
| `MoveFundamentalId` (10) | moveFundamentals | — | ❌ |

Five of six reconcile. The sixth is the positive half of the coach.

---

## §1 THE PLAN

Ordered by *risk-adjusted payoff*: each phase is shippable alone, and every one
makes the next cheaper. No phase is a rewrite.

### Phase 1 — reconcile the positive vocabulary (additive, lowest risk)
`Record<MoveFundamentalId, MisconceptionTagId | null>` in one place, so a new
positive fundamental **fails to compile** until someone decides where it files.
`luft` is an honest `null` — not every positive has a matching hole, and a
forced mapping would be a lie. Then a correctly-played fundamental becomes
evidence in the student's own model instead of a sentence that evaporates.
*Gate: a test that every non-null mapping names a real `MisconceptionTagId`, and
that the union is exhaustive.*

### Phase 2 — ONE fact shape, proven on ONE pair
Declare `CoachFact { kind: ClauseKind; text; squares; seat; rank }` — the shape
both composers already half-have — and convert the **concepts** pair
(`conceptEngine` / `reviewConcepts`) to emit it. Concepts first because
`conceptEngine` already has 25 audits reaching it, so the blast radius is
measured rather than guessed.
*Done when: one detector feeds both composers and the review-only twin is gone.*

### Phase 3 — the remaining three pairs onto that shape
threats, fundamentals, plans. Each is the Phase-2 move repeated. Register is a
REQUIRED parameter, never a branch at the call site (the rule the seat and the
register guards already follow).

### Phase 4 — extract composition out of the 13,895-line page
The surgical cut is **narration composition only** — the code that decides WHAT
to say. UI, routing and React state stay in the page. Target: `CoachTeachPage`
consumes the same composer Review and Play do, and its direct `services/`
imports fall from 100 toward the ~40 the other surfaces need.
This is the biggest phase and the one that must NOT be attempted before 1–3,
because extracting a composer that calls disjoint computers just moves the
divergence into a new file.

### Phase 5 — the gate that keeps it closed
A scan test: a coach SURFACE may not import a fact computer directly; it goes
through the composer. Baseline the current offenders and let it only shrink —
the pattern already used for the narration-coverage baselines.

---

## §2 SEQUENCING LOGIC

* Phase 1 is first because it is **additive** — nothing changes behaviour until
  the mapping is consumed, so it cannot regress a surface.
* Phase 2 before 3 because the first conversion discovers the shape's real
  edges; doing four at once means four half-right shapes.
* Phase 4 last because it is the only phase that cannot be done safely while the
  computers underneath still disagree.
* Phase 5 last because a gate written before the cleanup just encodes the mess.

## §2.5 STATUS (2026-09-17)

| phase | state | what landed |
|---|---|---|
| 1 — positive vocabulary | ✅ | `MOVE_FUNDAMENTAL_TAG` + `leadingFundamentals` (the structure now crosses the boundary). Gate: `fundamentalVocabulary.test.ts`. Recording a positive is owed — the spine is aggregate-based and needs its own store. |
| 2 — one concept vocabulary | ✅ | `conceptVocabulary.ts` bridges six ideas spelled two ways; `POSITIONAL_INVARIANT`/`POSITIONAL_PRIORITY` typed over the union (both were `string`-keyed, so a typo yielded no concept silently). Gate: `conceptVocabulary.test.ts`. |
| 3 — one fact shape | ✅ | `PlanBeat` gained a REQUIRED `id` + `squares`, so review's plan beats can finally be ranked and subsumed (a squareless fact is never collapsed — G4.5.1). The compiler found a fifth producer the grep missed. Gate: `planBeatShape.test.ts`. |
| 5 — the gate | ✅ | `surfaceComposition.scan.test.ts` — **254** direct fact-computer imports across 56 surfaces, 62 in `CoachTeachPage`. Shrink-only. |
| 4 — extract the page | 🔨 started | First slice: `standingFactMemory` — the forget-on-rewind say-once rule was implemented TWICE (usePhaseNarration + CoachTeachPage, different ref names, and the page's comment admitted "same reasoning as the phase hook"). One copy now. |

⚠️ **A LIMIT OF THE PHASE-5 METRIC, found by tripping it on the first slice.**
Extracting a shared rule into a service that both surfaces IMPORT does not lower
the count — it raised it 254→256, and the gate correctly went red on my own
change. The metric measures *how many modules a surface reaches into*, so only
routing through a COMPOSER moves it; sharing a helper does not. That is arguably
the right incentive (the page still reaches into 63 modules), but it means
Phase 4 progress shows up as a falling number only for composer work, and
duplicate-rule extraction has to be judged on its own merit. `standingFactMemory`
is classified INFRA because it computes no chess fact — stated out loud in the
test, because it is the exact shape of the cheat that gate warns about.

**PHASE 4 AND 5 WERE SWAPPED ON PURPOSE.** Extracting composition from a
13,900-line page as a single heroic refactor is how that refactor goes wrong.
Building the gate first turns Phase 4 from one big-bang change into a number
that goes down every session, and makes any regression visible the moment it
lands rather than at the end.

## §2.6 PHASE 4, SHARPENED (measured 2026-09-17, after slice 1)

**The ASSEMBLER is already shared. The FACT PRODUCTION is not.**
`buildVoicePackage(facts, alreadySaid?, spokenKeys?)` owns ranking and the
one-fact-one-utterance dedupe, and BOTH Teach (directly) and Review (through
`coachFeatureService`) reach it. So "what gets spoken, in what order, without
repeating" is unified already.

What the page owns alone is everything BEFORE that call: producing the facts
from ~62 computers. So Phase 4 is not "extract the narration layer" — it is:

> **`buildLearnFacts(ctx) → VoiceFact[]`** — one producer the page calls
> instead of orchestrating 62 computers inline, shaped so Play can call it too.

That is a much better-defined job than the original phrasing, and it explains
why the surfaces still diverge despite sharing the assembler: they agree on how
to SAY things and disagree on what there is to say.

### Pairwise overlap (non-infrastructure), measured
* Teach ∩ Review — `voicePackage`, `chessConceptService`, `openingIntentCapture`, `liveTacticsContext`
* Teach ∩ Play — `phaseTransitionDetector`, `openingDetectionService`, `weaknessAnalyzer`, `boardClaimValidator`, `groundedAnswer`, `tacticClaimValidator`, `liveTacticsContext`
* Review ∩ Play — `accuracyService`, `missedTacticService`, `coachFeatureService`, `autoAnalyzeGame`, `liveTacticsContext`

`liveTacticsContext` is the ONLY teaching computer all three share. Note Play
reaches the REVIEW composer (`coachFeatureService`) while Teach does not — so
Teach is the outlier, not review-vs-live.

## §2.7 🚨 THIS PLAN IS THE *FACT* AXIS — THE LOCKED PLAN'S PHASE 7 IS THE *ADAPTIVE-DECIDER* AXIS, AND IT IS STILL UNTOUCHED

Caught 2026-09-17 when David said "regain context soon to make sure you have not
missed anything" and the two coach docs were re-read. He was right.

`docs/plans/2026-09-08-unified-coach.md` **§Phase 7 — CONSOLIDATION** already
specifies a consolidation, with a verified inventory, and it is NOT the one this
document has been executing. This plan reconciled VOCABULARIES and SHAPES
(fundamentals, concepts, PlanBeat). Phase 7 is about the ADAPTIVE DECIDERS —
every rating-scaled decision that lives outside the one algo.

Both are real. But Phase 7 is the LOCKED plan and it should have been checked
BEFORE choosing an axis. Re-verified today, the 2026-09-08 inventory still holds:

* **(A) importance/criticality — LARGELY DISPROVEN, verified by reading 2026-09-17.**
  The 2026-09-08 inventory named five orphans of `criticalityThresholds`. Read
  one by one, they are not orphans:
  - `computeImportance` (narrationImportance.ts:122) — ALREADY derives from it.
  - `minSwingPawns` (reviewTurningPoint.ts:64) — ALREADY derives from it
    (`criticalityThresholds(rating).critical / 100`, one line).
  - `computeCriticality` / `criticalitySignalsFromAnalysis` (criticality.ts) —
    **not the same concept at all.** It is a 0–100 SHARPNESS score of the
    position from engine signals (MultiPV spread, only-move gap, seldepth
    spike, loose material). It takes no rating and scales by none. The
    inventory conflated the WORD "criticality". Nothing to absorb.
  - `isCriticalThreat` + `alertSensitivityMultiplier` — **a different axis, on
    purpose.** Measured side by side:

    | rating | `criticalityThresholds.critical` | `alertSensitivityMultiplier` |
    |---|---|---|
    | 600 | 200 cp | 0.60× |
    | 1500 | 100 cp | 1.00× |
    | 2400 | 50 cp | 1.40× |

    They run in OPPOSITE directions. DIAGNOSIS ("was this mistake worth
    teaching") falls as the student improves — don't stop a 900 over a 50cp
    inaccuracy. HELP ("should I warn you about this danger") rises — a beginner
    needs the warning, a strong player should spot it. Beginner: teach only big
    mistakes, warn often. Advanced: teach subtleties, warn rarely. **Merging
    them inverts the pedagogy on both axes at once and nothing downstream would
    go red.** Consumer sets are already cleanly disjoint (9 diagnosis files vs
    2 help files, no file reads both). Gate added:
    `skillScaling.test.ts` asserts the opposite slopes AND the disjointness, so
    the next session that reads the plan doc and tries to "absorb" them fails
    the build with the reason in the message.

  What (A) actually leaves: nothing to unify. The doctrine needed writing down,
  not the code changing. Recorded here so this is not re-derived a third time.
* **(B) depth/ply — NOT duplicates either, and the reason generalises. DONE
  2026-09-17.** Three functions with "depth" in the job description, answering
  three different questions: `pvBandForRating` (how many player-moves of the PV
  a mistake puzzle asks for, 1200/1700), `getTacticLookahead` (how many plies
  the coach SCANS for a tactic, 1000/1400/1800), `causalChainDepth` (how many
  SENTENCES get spoken, 1400/2000). The third runs BACKWARD from the other two.

  That is the same shape as (A), and it is the real Phase-7 finding:

  **THERE ARE TWO KINDS OF ADAPTIVE DECIDER, AND THEY RUN IN OPPOSITE
  DIRECTIONS.** CAPACITY — how much CHESS the student can handle (calculation
  horizon, puzzle depth, how subtle a mistake is worth teaching) — RISES with
  strength. SUPPORT — how much HELP they get (warnings, sentences of
  scaffolding, which hint rung) — FALLS with strength. Beginner: teach only big
  mistakes, warn often, explain every link. Advanced: teach the subtleties, warn
  rarely, one line.

  Two deciders of the same kind may be reconciled. Two of different kinds never
  may — and because each decider's tests only pin its own numbers, merging them
  inverts both pedagogies with nothing going red. Encoded as
  `ADAPTIVE_DECIDERS` in `ratingBands.ts`: a `Record` over the union of all
  seven, so a NEW decider fails to compile until someone declares its kind, and
  each entry's declared SLOPE is proved against the real function at three
  ratings by `ratingBands.test.ts` (negative control run: flipping one
  declaration fails the build with the measured numbers in the message).

  **Boundaries deliberately NOT unified.** Where "how far can you calculate"
  changes is not where "how subtle a mistake matters" changes. Flattening all
  seven onto `coreRatingTier`'s 1000/2000 would move real students between real
  behaviours with no evidence any individual move is right. Written into the
  code so the next session does not do it for tidiness.
* **(C) verbosity — ONE REAL BUG, fixed 2026-09-17. The G5 warning was right and
  the user's setting was the thing being lost.** Five verbosity-ish preferences
  exist; only two are live. `coachNarration` (silent/brief/full) governs the
  VOICE — G5, untouched. `coachResponseLength` (minimal/normal/verbose) governs
  CHAT TEXT length; G5 says that split is deliberate ("the chat bubble still
  shows the full prose; only the spoken voice obeys the brief budget"), so they
  are NOT duplicates. `coachVerbosity`, `phaseNarrationVerbosity` and
  `coachCommentaryVerbosity` are the three LEGACY fields the unified setting
  replaced; `resolveCoachNarration` reads them as a migration fallback.

  The bug: `coachApi.getCoachVerbosity()` read the LEGACY `coachVerbosity`
  directly, in the opposite direction. Its Settings row was removed and NOTHING
  in the app writes it (measured: every occurrence is a default, all
  `'unlimited'`), so `getVerbosityInstruction` returned the FULL block for every
  user on that path — "walk through the move, both sides' plans, alternatives,
  past games... no length cap". The student's real choice arrived beside it as a
  SECOND block from `loadResponseLengthAddition`. Both go into one array literal
  at `buildSystemPromptFor`. A student on Minimal got "at most 8 words, NO
  multi-sentence responses" and "no length cap" in the SAME system prompt.

  Worse, the two blocks were unequal in the wrong direction: the surviving one
  (`VERBOSITY_INSTRUCTIONS.fast`) was SOFT — "direct and immediate", no number —
  which is precisely what G5 bans after a production audit caught the brain
  shipping 497 characters on "brief".

  Fixed: `getCoachVerbosity` derives from `coachResponseLength` via a
  `Record<'minimal'|'normal'|'verbose', CoachVerbosity>` (legacy field honoured
  for a profile that still carries one, else 'medium' — what
  coachResponseLength's own documented default has always meant); the numeric
  ceilings moved into VERBOSITY_INSTRUCTIONS, where NO_SCAFFOLDING_RULE already
  lives; `loadResponseLengthAddition` deleted. One dial, one block. Gate:
  `coachPrompts.verbosity.test.ts` — the capped tiers must state a NUMBER, no
  tier may carry both a ceiling and "no length cap", every tier keeps the
  no-scaffolding rule, and coachApi may not compose a second length block.

  The modern chat path (`coachService` → `envelope.ts`) was already coherent —
  it reads `coachResponseLength` into its own block and never touched
  `coachVerbosity`. Only the legacy coachApi path (walkthrough narrator,
  opening-section narrator, smart search, kid puzzles, middlegame planner,
  CoachGameReview) carried the contradiction.
* **(D) rating bands** — **two `ratingBandFor`** (`amateurPlayCache.ts:34` and
  `theoryDeparture.ts:59` — a name collision with different returns) plus
  `explorerBandForElo`: three overlapping explorer-band pickers. **DONE
  2026-09-17** — `ratingBands.explorerBandFor` is now the only picker; all three
  delegate; gate in `ratingBands.test.ts`. Two real teaching bugs fell out: the
  band never CONTAINED a 1300 or a 1900 player on the theory path, and the top
  band was a lone bucket because one private bucket list stopped at 2200.
  `hintStartTier` (skillScaling.ts:49) was UNWIRED — **WIRED 2026-09-17**, not
  deleted: `AnalysisPracticePage` has a real 1–3 hint ladder that started every
  student at tier 1 regardless of rating, so a 900 tapped three times to reach
  the rung they needed. It now starts where the student's recorded tactics skill
  says (rating as the cold-start prior only).
* **the completeness gate — DONE 2026-09-17,
  `src/coach/tools/registry.completeness.test.ts`.** Until now the only claim
  was a COMMENT at the top of `registry.ts`: "all 23 registered + reachable —
  verified 2026-09-08". NOTHING in the whole suite imported `COACH_TOOLS`, so
  that line was a promise, and a promise rots. Five checks:
  1. no tool file exists that the registry never lists (the "built but mounted
     nowhere" class), read from each file's own `name:` literal so a module that
     is never IMPORTED is still seen;
  2. `getTool(name)` resolves every registered tool and no two share a name;
  3. `getToolDefinitions()` ships every contract to the LLM and leaks no
     executor;
  4. **proof, not an import check** — every tool is actually INVOKED with no
     args and no surface. An ACTUATOR must return `{ok:false}` with a reason
     ("don't claim the board was reset on a surface that has none"); a READ tool
     may honestly succeed and must then return a payload. The first cut got this
     wrong and flagged `lookup_player_games`, whose no-filter default genuinely
     means "the best games we have" — the test was wrong, not the tool, and the
     split made the check STRONGER rather than looser.
  5. the same standard for computers: **4 spine modules have ZERO production
     importers** — `coachChatService` (10 exports; CoachChatPage does not import
     it), `tacticDrillService` (3 exports and no test — a second drill-queue
     builder beside the live one, which builds from `puzzlesByOpening`),
     `threatCheck` (the computer behind the card David removed on 2026-08-05),
     `openingNameClaimValidator`. Held as a shrink-only ceiling, NOT deleted:
     two of the sweep's own first candidates were false (`coachsCall` is reached
     by a DYNAMIC import a static regex missed), which is the "prove it's
     actually dead" rule earning its keep.

**Sequence from here:** finish or park the fact axis, then run Phase 7 starting
at `criticalityThresholds`, because the plan says everything else derives from
it. Do not start at the leaves.

## §3 DECISIONS LOG

* **2026-09-17 — do NOT merge function bodies.** Reading the exports showed the
  pairs ask different questions of the board. The target is one vocabulary and
  one shape, not one function. (Claude; flagged to David in the inventory.)
* **2026-09-17 — DO NOT extract the `activeTokenRef` counter.** It appears in
  three hooks (`usePhaseNarration`, `usePositionNarration`, `useReviewPlayback`)
  and is genuinely the same idiom: increment on a cancel-worthy event, capture
  the token, compare before applying. It was considered for a Phase-4 slice and
  REJECTED — unlike the forget-on-rewind rule, it has no subtlety to drift.
  Increment/capture/compare is three lines with nothing to get wrong
  differently, so a module would buy indirection and no safety. Extracting for
  the sake of the number is churn.
* **2026-09-17 — the "threats" pair was NOT a duplicate.** §0.2 listed it as
  one, inferred from dependency disjointness. Reading the code:
  `opponentIntent` is engine-fan derived (their candidates, prospective) and
  `reviewOpponentCommentary` is board-derived (what this move did,
  retrospective). Different jobs; the duplication was in the SHAPE. Corrected
  rather than forced into a merge.
* **2026-09-17 — `luft` maps to null.** Not every positive fundamental has a
  matching hole; a forced mapping would be invented data (G3).

## §4 NEXT-SESSION PICKUP

Read §0 first — it is measured, not remembered. Then §1 Phase order. The live
composer is `positionFacts`, the review composer is `coachFeatureService`, and
the door is `coachDecider.decide()`. Regenerate any surface map with
`node scripts/surface-map.mjs <file>` before changing that file.


## §4 THE RATING INPUT — measured 2026-09-17, code REVERTED, finding kept

Not built. The first attempt was wrong in a way worth writing down, and David
caught it in one line ("Sounded like you are setting a generic teaching elo").

### The defect, measured

EVERY write to `profile.currentRating` requires an IMPORT:

| writer | fires when |
|---|---|
| `dbService` profile creation | always — seeds **800** |
| `strengthCalibrationService.applyStrength` | first boot, `source === 'imported-games'` ONLY |
| `gameAnalysisService:2165` | `continue`s unless `source` is lichess/chesscom |
| Settings / Onboarding | the user types it |

`getPlayerRatingEstimate` HAS a coach-games arm — a running K=32 ELO over the
games the student actually played here, the only genuinely adaptive signal the
app computes. `calibrateStrength` rejects it (`imported-games` only) and then
short-circuits forever on `strengthCalibrated`. Nothing else reads it: the
service has exactly TWO importers and one is its own test.

So a student who never imports is **800 for life**, and 800 buys them
(measured):

| rating | teach bar | tactic scan | explorer band | hint starts | alert mult |
|---|---|---|---|---|---|
| **800** | **200cp** | **1 ply** | 1000,1200 | **tier 3 — answer on tap one** | 0.69 |
| 1200 | 100cp | 2 ply | 1200,1400 | tier 3 | 0.87 |
| 1600 | 100cp | 6 ply | 1600,1800 | tier 2 | 1.04 |
| 2000 | 100cp | 10 ply | 2000,2200 | tier 1 | 1.22 |

At 800 only BLUNDERS are ever taught — every mistake and inaccuracy is silent —
and the hint ladder hands over the answer on the first tap. `dbService`'s own
comment says 800 is "only ever live until calibration runs at boot (imported
games, else the first-run skill picker)"; **the picker was deleted 2026-09-02**,
so the comment describes a path that no longer exists.

### Why the first fix was wrong

Writing the estimate back makes it its own input: boot 1 replays ten games from
800 and stores 950, boot 2 replays the SAME ten from 950 and stores 1100 — the
rating climbs forever on no new evidence. The attempted cure anchored the
running ELO at `DEFAULT_RATING` (1200), which kills the drift and is GENERIC:
K=32 moves at most ±160 over five games, so a real 700 lands ~1040 — the
anchor's number, not theirs. Replacing one hard-coded rating with another is
not an algo.

### The correct shape (not built)

A per-student baseline, stored ONCE and never rewritten by the estimate:

* `ratingBaseline` = the imported rating when there is one, else the first
  evidence-backed reading; written once.
* the coach-games estimate is then `baseline + f(their games)` — a pure
  function of THEIR play, so re-running it every boot converges instead of
  drifting, and no two students share an anchor.
* the refresh writes `currentRating` ONLY (the puzzle SRS owns `puzzleRating`)
  and only from an evidence-backed source, so a Settings rating survives until
  real games contradict it.
* gate: replay the same fixed game set through two consecutive refreshes and
  assert the rating does not move — the compounding bug, caught by construction.

Also still open (secondary, and smaller than it looked): the call-site
fallbacks. `selectUserRating` already exists with the right 1200 prior and ~40
sites hand-roll `activeProfile?.currentRating ?? 1200` instead, five of them
`?? 1420`. That only bites when the profile is null, which is rare — the 800 is
the defect that actually reaches students.


## §5 THE BASELINE IS A CAPABILITY PROFILE, NOT AN ELO (David 2026-09-17: "Not elo based. I want it to be capabilities of our system.")

This REPLACES §4's proposed fix. §4 argued about which NUMBER to anchor the
first baseline at; David rejected the framing outright, and he is right — a
scalar is lossy in exactly the place it matters. Two students at 1200, one who
hangs pieces but calculates well and one who never hangs but has no plan, get
IDENTICAL teaching today. The app already knows the difference and throws it
away to produce one integer.

### The vocabulary already exists and is already closed

`src/data/misconceptionTags.ts` — **25 named tags + `other`**:

    left-book-early · neglected-development · king-stuck-center · greedy-pawn-grab
    tempo-handed · space-conceded · hung-material · missed-tactic · calculation-depth
    missed-opponents-threat · overvalued-attack · poisoned-pawn · weakened-king-safety
    created-pawn-weakness · misplaced-piece · bad-trade · overextended-pawn
    capture-toward-centre · bad-trade-material · passive-king-endgame
    mistimed-pawn-break · botched-conversion · passed-pawn-neglected · passive-rook
    no-plan

It is persisted, it is the closed set the classifier must choose from, and it is
ALREADY joined to computed facts by three matchers (`matchTacticPattern`,
`matchClauseKind`, `clauseKindForTag`) and bridged to `MoveFundamentalId` /
`PositionalConceptId` / `ReviewConceptId` by this session's earlier work. There
is nothing to invent — the capability axis is the one the app already speaks.

### This is a PROMOTION, not a rewrite

`positionFacts:515` already computes `momentWeaknessBoost(clauses, weaknesses)`
and feeds it to the decider. The capability model is:

* promote that join from a **modifier on a rating-driven base** to the
  **primary**, and
* demote the rating to what the ALGO-BASED rule already says it is — a
  cold-start prior, nothing more.

### 🚨 THE BLOCKER, and it is load-bearing

**The app records FAILURES and never SUCCESSES.** `weaknessSpine:403` says it
outright: "un-solved tactic (no puzzle success yet) counts as open." So a
capability can be `broken` or `unknown` — never `held`. A profile built on that
can only ever degrade, and "they have this one" is unsayable.

That is task #65, which CLAUDE.md lists as OWED and as gating the "lower"
direction of the weakness boost. Under a capability baseline it stops being a
decay-curve nicety and becomes **the critical path**: without the positive
half there is no capability profile, only a defect list.

### The cold start needs NO number

Unknown capability = teach it. The obvious objection — 25 unknowns means the
coach never shuts up — does not hold, because **the BOARD rations it, not a
rating**: you only teach the capability the position in front of the student
actually demonstrates. One position exercises one or two. That is self-limiting
by construction, it needs no prior, and it is strictly more honest than
guessing a band. A fresh student is taught what the board shows them, and the
profile fills in from what they then do.

### What genuinely still needs a scalar (and only these)

* `explorerBandFor` — the Lichess explorer API accepts rating buckets ONLY.
  External interface, not our design.
* Stockfish opponent strength — an engine needs an ELO.

Both should read a number DERIVED from the capability profile and labelled as
derived, so nobody mistakes it for the student model. Every other rating-scaled
decider (`criticalityThresholds`, `getTacticLookahead`, `hintStartTier`,
`alertSensitivityMultiplier`) is asking a question the capability profile
answers better.

### Order

1. **#65 first** — record correct play. Nothing else is possible without it.
2. `CapabilityProfile` over the closed tag set: `held | broken | unknown` per
   tag, with the provenance shape §CAPABILITY PARITY already demands.
3. Re-point the deciders that don't need a scalar.
4. Derive the two that do, and say so at the call site.
