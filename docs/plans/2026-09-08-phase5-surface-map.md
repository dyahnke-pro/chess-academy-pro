# Phase 5 Surface Map — the custom lesson ("build me a lesson from my weaknesses")

**§0 gate for P5** of `docs/plans/2026-09-08-unified-coach.md`. Status: **MAPPED —
ready to build.**

## What P5 does (David 2026-09-08, decided)
From **Learn with Coach** (`/coach/teach`), the coach OPENS by STATING a PICKER
of the student's aggregated top holes ("want to work on X, Y, or Z? — or tell me
what you'd like"). Picking one builds an **adaptive (~3-part)** lesson from those
holes: each part TEACHES the concept (grounded in the book corpus) then DRILLS
the student's OWN flubbed positions for that pattern. Entry = Learn with Coach
(no new route). The opening phrase states the picker.

## The surface (mapped)
- **Entry / opening phrase:** `CoachTeachPage` kickoff IIFE (`~9384–9548`). Today
  it: rotates a greeting (`pickGreeting`), computes the top weakness
  (`getUnifiedWeaknessProfile`), offers a single "Drill my weaknesses" chip
  (`setCoachChoices`), speaks a "coach's call" / session opener, appends
  `curriculumArcLine(getCoachCurriculum())`. → **This is exactly where the picker
  opening-phrase + chips go.**
- **The arc / sequencer:** `coachCurriculumService.ts` — `getCoachCurriculum()`
  returns a persisted `CoachCurriculumRecord { items: CurriculumItem[] }` where
  live items (status `active`/`queued`, ARC_SIZE=3) ARE the sequenced top open
  holes; `syncCoachCurriculum()` advances it when a hole is drilled shut.
  `CurriculumItem { tag, label, patternThemes, status }`.
- **Concept teaching (grounded, G0):** `conceptForCluster(tag, bucket)`
  (`weaknessConceptMap.ts`) → `WeaknessConcept { behavior, conceptQuery,
  conceptName }`; `searchTheoryPassage(concept.conceptQuery)`
  (`chessConceptService.ts`) → the public-domain corpus passage. coachApi.ts:3920
  is the reference wiring. The teaching text is corpus prose + code-authored
  behavior — NO LLM decides it.
- **Drilling the student's OWN positions:** `buildMistakeDrillQueue({ motif, rating,
  cementReps:1 })` (`coachDrillService.ts`) filters the stored mistake puzzles to
  ONE cluster (`motif` = the tag with `analysis:` stripped) → drills. In
  `CoachTeachPage`, `startCoachDrill(drill, progress, lead)` mounts it on the
  board; `processDrillMove` validates; `completeDrill` advances the queue and, on
  the queue's end (`adv.done`), calls `syncCoachCurriculum()`.
- **The bucket** each `CurriculumItem` lacks is recovered by joining the arc tag
  to the `UnifiedWeakness` in `getUnifiedWeaknessProfile()` (it carries `bucket`).

## The build (design)
1. **New pure leaf `src/services/customLessonPlan.ts`** (testable, no Dexie):
   - `CustomLessonPart { tag, label, bucket, concept: WeaknessConcept | null,
     patternThemes: readonly string[] }`
   - `CustomLessonPlan { parts: CustomLessonPart[]; pickerLine: string;
     pickerChips: string[] }`
   - `buildCustomLessonPlan(items, profile, max=3)` — orders the arc's live holes,
     joins each to its profile bucket, maps to `conceptForCluster`; code-authors
     the picker opening phrase ("Want to work on {A}, {B}, or {C}? Pick one and
     I'll build you a lesson — or just tell me what you'd like.", 1/2/3-aware) and
     the per-hole chips + a "Build my full lesson" chip.
   - `matchCustomLessonRequest(text, plan)` — recognizes a general "build/make me a
     lesson / custom lesson / lesson on my weaknesses" ask (typed path) OR an
     exact offered chip → returns `{ tags }` (all holes for the full/general ask,
     `[tag]` for a specific hole) or `null`.
   - `customLessonIntro(parts)` / `partTransition(part, i, n)` — code-authored
     spoken beats between parts.
2. **Orchestrator in `CoachTeachPage`** (`startCustomLesson(tags)` +
   `advanceCustomLesson()` held in a `customLessonRef`):
   - build plan (profile + curriculum) → filter to `tags` → **empty state:** if no
     part has drillable material, say so and stop (no invented drill).
   - part i: TEACH (speak `concept.behavior` + `searchTheoryPassage` passage —
     grounded, instant, no LLM) → build the motif drill queue → if non-empty
     `startCoachDrill` (tagged so `completeDrill` routes back here); if empty →
     teach-only part, advance immediately.
   - `completeDrill` done-branch: if `customLessonRef.current` → `advanceCustomLesson()`
     (next part, or close: "That's your custom lesson done — {N} patterns worked;
     I'll bring the reps back over the next few days." + `syncCoachCurriculum()`).
3. **Picker wiring:** in the kickoff opener, when the arc has ≥1 live hole, set the
   picker chips + speak the picker line (replacing / alongside the single
   drill-chip opener). `handleSubmit` calls `matchCustomLessonRequest` early
   (before opening-name resolution, next to the training-aid router) → `startCustomLesson`.
   The typed path ("build me a lesson") works with no chip tapped.

## Standing-order surface requirements
- New route? **No** — in-place in Learn with Coach.
- Nav entry? **No** — reached from the existing surface.
- Loading / empty / error states: **empty** = "not enough games mapped yet"
  (no arc) → fall back to today's generic opener; **error** = every read is
  try/caught, the picker silently degrades to the existing opener.
- Feature flag: none (additive, inert until a weakness profile exists).
- PostHog events: `custom_lesson_offered {holes}`, `custom_lesson_started
  {parts, entry}`, `custom_lesson_part_advanced {idx, tag}`,
  `custom_lesson_completed {parts}`.

## Audit coverage (David: "audit tests ALL new functions of the coach")
Every Phase 1/1b/2/3 personalization function AND the custom lesson is
INERT-until-fed — a fresh audit game never triggers them. The comprehensive
audit (`scripts/audit-unified-coach-prod.mjs`, new) SEEDS a weakness profile
(mistakePuzzles + misconception tags + a couple of games into Dexie via
`page.evaluate`) so:
- positionFacts weakness re-rank fires (a matched clause leads on the board),
- `speakDeepestLookahead` tactic-motif tag fires ("you tend to miss this"),
- book-departure surfaces in the profile,
- the causal-chain recurrence recap fires in review,
- the custom-lesson picker opening phrase STATES the seeded holes, a chip builds
  the lesson, the concept is taught and the student's own position drilled,
then asserts each comes OUT (3 instruments: Playwright + audit-stream +
narration listener). "A wire that does not fire is not a wire" — applied to the
whole unified coach.
