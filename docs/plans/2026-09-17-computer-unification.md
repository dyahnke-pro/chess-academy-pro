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

## §3 DECISIONS LOG

* **2026-09-17 — do NOT merge function bodies.** Reading the exports showed the
  pairs ask different questions of the board. The target is one vocabulary and
  one shape, not one function. (Claude; flagged to David in the inventory.)
* **2026-09-17 — `luft` maps to null.** Not every positive fundamental has a
  matching hole; a forced mapping would be invented data (G3).

## §4 NEXT-SESSION PICKUP

Read §0 first — it is measured, not remembered. Then §1 Phase order. The live
composer is `positionFacts`, the review composer is `coachFeatureService`, and
the door is `coachDecider.decide()`. Regenerate any surface map with
`node scripts/surface-map.mjs <file>` before changing that file.
