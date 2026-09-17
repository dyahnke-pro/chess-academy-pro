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
* **(B) depth/ply** — `pvBandForRating`, `depthFor`, `getTacticLookahead`.
* **(C) verbosity** — 7 sites, and a WARNING that comes with them: these encode
  the USER's G5 choice. "The algo governs importance/depth; G5 stays the user's
  own ceiling. Reconcile, don't erase the user's setting."
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
* **the completeness gate** — a test that every fact-computer and every tool is
  REACHABLE by the selector/spine: "a note comes OUT / tool CAN be invoked
  proof, not an import check".

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
