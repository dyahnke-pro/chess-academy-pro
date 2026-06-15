# PLAN — Turn the Openings tab into GM-style COURSES (2026-06-15)

**Owner:** David. **Status:** design locked, P1 (engine) done + green, P2+ pending.
**One-liner:** A GM-style **course** experience — a numbered **chapter**
syllabus, each chapter a **situational prescription** ("when White plays X, YOUR
move is Y, because Z"), with course-wide progress, one-tap Resume, and a finish
line.

## PLACEMENT + PAYWALL (David, 2026-06-15)

- **Home: The Academy tab** (`/academy`, `AcademyPage.tsx`) — already exists as
  the "school" surface (currently the *Philosophy of A General* audiobook). The
  courses become a SECOND section there: audiobook = "read the doctrine",
  courses = "train the repertoire". Build INTO The Academy, don't make a new tab.
- **Monetization: PAY-PER-CLASS, not a Pro subscription (David 2026-06-15).**
  Each course/class is bought individually (à la carte), NOT unlocked by a
  blanket Pro tier. **Decide the exact model AFTER it's built** — David:
  "we will discuss that after its built." So: build the course experience and
  the gating SEAM, but do NOT wire a specific purchase flow yet. Design the
  unlock check as a per-course entitlement (`isCourseUnlocked(courseId)`) so it
  can be backed by per-class purchases later — don't hardcode the existing
  app-wide `isPro` as the gate. (The existing `entitlementStore` may inform the
  per-class store but the unit is the CLASS, not the account.)
- **The free/paid line == the database/course line that started this:**
  - **Openings tab = FREE library** — browse / search / look up. The
    encyclopedia. No opinion, no path. (Unchanged.)
  - **The Academy = PAID courses** — the GUIDED experience: syllabus, chapters,
    prescriptive coaching, Resume, finish line, warm voice. Same underlying
    content (variations / WLPP / lessons); the free tab *shows* it, the paid
    Academy *coaches* you through it.
- **OPEN FORK for David:** does the Openings tab STAY as the free library
  (recommended), or does The Academy eventually absorb it? v1 keeps both.

> `PLAN.md` (repo root) is the Carlsen pro-rep build — do NOT clobber it. This
> course-structure work lives here.

---

## 🔒 ABSOLUTE RULE — EVERY recommended move has a WHY (David 2026-06-15)

A course is a **personal hand-picked weapon**. The student isn't paying for a
list of moves — they're paying for **the reasoning behind each pick**. So:

- **EVERY recommended move (variation AND subline, every ply we recommend)
  carries an exact "why we play this" explanation.** "Bf5 — because it solves
  the bad-bishop before …e6 ever traps it." No bare moves, ever.
- **Make it a HARD GATE:** a course move with no why does not ship (a
  `courseMoveWhy` test, same class as `wlppNarration` / `narrationAccuracy`).
- **The why is GROUNDED, never invented (G0/G3).** Sourced from: DB frequency
  ("the main weapon, N% of masters"), engine confirmation (Stockfish holds the
  edge), and the book/concept corpus (the idea) — voiced, not made up. The
  `explainBestMoveGrounded` / `groundedAnswer.ts` pattern is the template.
- ✅ **Why-source = BOTH (David 2026-06-15):** grounded/computed why on EVERY
  move from day one (DB-derived floor — nothing ships without a why) + authored
  weapon-grade why layered on the flagship masterclass set over time. Same
  floor/ceiling split as the subline sources. No-move-without-a-why is the gate.

This SUPERSEDES the "DB-derived sublines are lighter on prose" framing: the moves
may be DB-derived, but the WHY is mandatory on every one.

## THE VOCABULARY — variations vs sublines (David, 2026-06-15, the key articulation)

The free/paid line is a DEPTH line, and David named it precisely:

- **Variation** = a top-level named branch (the Advance, the Exchange, the
  Classical). Breadth. **Already offered free in the Openings tab** (main line +
  variations).
- **Subline** = the deeper branches INSIDE a variation — the answers to every
  opponent deviation within it (under the Advance: 3…c5 vs 3…Bf5; under Bf5:
  4.Nf3 vs 4.h4 …). Depth. The "never out of book" layer.

**Openings tab (FREE) teaches VARIATIONS. A COURSE (PAID) teaches BOTH —
variations + sublines.** Buy the course, you get it all (no further gating
inside a course). The DEPTH (the sublines) is the product; the variations are
already free, so what's paid for is the complete gap-free tree + the syllabus +
prescriptive coaching wrapped around it.

**🔒 PAYWALL RULES (David 2026-06-15, firm):**
- **The Openings tab gives EVERY variation, free.** ALL variations, not a
  curated subset — main line + all variations, no gate.
- **NEVER paywall an individual variation.** Variations are never the paid unit.
- **The ONLY paid thing is the COURSE** (per opening) = the sublines (depth) +
  the course wrapper (syllabus / prescriptive coaching / adaptive trainer).
- **Buying a course unlocks the whole course** — no per-variation, per-subline,
  or per-chapter gating inside it.

**Structural consequence: the syllabus is a TWO-LEVEL tree** (Chapter =
variation → Sublines), exactly the Chessable nested contents tree. The course
is the ONLY surface where sublines appear.

### 🚨 Data-source decision this forces (G3)
Sublines = real DB lines, NEVER invented (G3 + "if it's not in the Lichess DB it
doesn't exist"). Source options for each variation's sublines:
- **DB-derived (recommended):** the sub-branches under the variation in
  `openings-lichess.json`, via the existing sibling/continuation machinery
  (`findSiblingExtensionBranches`, `findContinuationsAtPly` in
  `openingDetectionService.ts`). Same engine the walkthrough forks already use.
- **Authored (deep):** hand-built per the masterclass/pro-rep deep-build
  doctrine (§G9.1) — more work, masterclass-grade.
- Current data: `OpeningVariation` has NO nested `sublines[]`; the model needs a
  subline layer (DB-derived first; author the masterclass set over time).
**OPEN for David: DB-derived sublines for v1, author later? (recommended).**

## The insight (David, 2026-06-15)

A GM course is NOT a neutral catalog of variations. It's **prescriptive and
situational**: the GM has already made the hard choices for you. *"Against the
Advance we play …Bf5 and break with …c5. Against the Exchange, the minority
attack. Against the Fantasy, take f3 and punish."* Each variation is taught as
**your weapon in that specific situation** — not one option among many. That
prescription is the value; it's what makes the student feel **coached, not
informed**.

And it's a **tree, not a list**: the student plays one side (the trunk), and
each chapter is the recommended answer to a thing the opponent can try. The
promise is **"you are never out of book."** Completeness IS the structure — a
repertoire with a hole is notes, not a course.

The **chapter** is the load-bearing unit. A chapter =
`situation → recommended move → plan → why`, wrapped around the WLPP ladder that
already exists for that line.

---

## It is FOUR layers (narration is the smallest)

### Layer 1 — Data: the repertoire gets an OPINION + no gaps
- Today: `opening.variations[]` is a neutral list; nothing marks "this is THE
  move" vs "what the opponent might try."
- Course needs, per chapter: the **trigger** (the opponent move/situation that
  routes here), the **recommended line** (already the variation pgn), and the
  one-line **why**. Derivable for masterclass openings from existing fields
  (`variation.name`, first deviating move, `variation.explanation`,
  `keyIdeas`); hand-polish where thin.
- **Completeness check:** every realistic opponent reply at the trunk's branch
  points should map to a chapter, or be honestly flagged as a gap. (No
  invention — G3. A missing branch is a TODO, not a fabricated line.)

### Layer 2 — Information architecture: variations → situational chapters
- `variationTabs.ts` ALREADY orders variations pedagogically (Ruy: Berlin →
  Open → Marshall → …). That ordered set IS the chapter list. Reuse it.
- Reframe the flat pill row as a **numbered chapter syllabus**: "Chapter 1: The
  Classical Main Line", "Chapter 2: When White grabs space — the Advance", …
- Chapter 0 / intro = the opening's `overview` + `keyIdeas` ("why this opening,
  the big ideas") — the course's welcome.

### Layer 3 — Structure: the course wrapper (the "enrolled" feeling)
- **Syllabus / contents view** at the top of the opening page: cover (name, ECO,
  color, style, pitch) + numbered chapter list, each with a progress ring +
  lock state.
- **Progress rollup** (NEW, pure computation over existing Dexie arrays):
  - per-chapter: which of Watch/Learn/Practice/Play done (4 dots).
  - course-wide: "Chapter 3 of 12 · 41%".
- **Resume / Next up →**: one tap to the first unfinished rung of the first
  unfinished chapter. Single biggest "I'm in a course" signal.
- **Finish line**: when every chapter's Play is done → "🏆 You completed the
  Caro-Kann Masterclass." (Today: nothing fires.)
- **Hub tiles** (`OpeningCard`): show course progress bar + "3/12 chapters" +
  Continue, alongside the existing mastery ring.

### Layer 4 — Narration: the warm, prescriptive voice (DEFERRED)
- The "…because Z" delivered like a GM coaching you. Smallest slice; explicitly
  deferred per the 2026-06-15 conversation. Touches narration voice rules
  (first-person carve-out for Watch) — its own decision later.

---

## What we REUSE (this is a reframe, not a rebuild)
- `variationTabs.ts` `CURATED` — chapter order, already authored.
- `wlppLadder.ts` (`isRungComplete`, `nextRung`, `isRungUnlocked`) — chapter
  completion math, per line.
- Dexie `OpeningRecord.lines{Discovered,Learned,Perfected,Played}` — every bit
  of progress a course needs is already persisted. No schema change for v1.
- `OpeningDetailPage` WLPP rungs + variation tabs — become the chapter view.
- `MasteryRing` — pattern for the per-chapter / course progress ring.
- `OpeningRecord.variations[].explanation` / `keyIdeas` — raw "why" content.

## What's NET-NEW
- `src/services/openingCourse.ts` — pure: build the chapter list (intro + ordered
  variations) and compute per-chapter + course-wide progress from an
  `OpeningRecord`. The foundation everything renders off. **Build + unit-test
  FIRST** (no UI risk).
- Course header + syllabus UI on `OpeningDetailPage`.
- "Resume / Next up" handler (route into the right tab + rung).
- Finish-line state.
- Hub-tile course-progress treatment.
- The chapter framing line (situation → move → why) per chapter.

---

## Phased build (each phase shippable)

- **P1 — Course progress engine (no UI). ✅ DONE.** `src/services/openingCourse.ts`
  + `openingCourse.test.ts` (9 tests green). `buildCourse(opening)` →
  `{ chapters[], total, completedChapters, currentChapter, percent, complete,
  nextStep }`; chapter = `{ n, lineIndex, label, isMainLine, summary, rungs,
  percent, status }`. Pure over `OpeningRecord` + `buildVariationTabs`.
- **P2 — The Academy COURSES index.** A "Courses" section in `AcademyPage`: a
  card per course (opening) with cover (name/eco/color/style), course %, and
  "X/Y chapters". Pilot set = the masterclass openings. Gated by `isPro` (P6).
- **P3 — Course detail = the SYLLABUS.** The course's front door: cover +
  numbered chapter list w/ per-chapter progress rings + "Chapter X of Y · NN%".
  Tapping a chapter enters the WLPP ladder (reuse `OpeningDetailPage`'s tab
  mechanism — scope to that variation). Resume / Next up → first unfinished rung.
  Finish-line state when complete.
- **P4 — Prescriptive chapter framing.** situation → recommended move → plan →
  why per chapter (derive from data; hand-polish masterclass set).
- **P5 — Course progress on the existing detail page / hub tiles** (so the free
  library hints at the course).
- **P6 — Gating SEAM (pay-per-class).** A per-course unlock check
  `isCourseUnlocked(courseId)` (NOT app-wide `isPro`) + a locked-syllabus teaser
  for not-yet-purchased classes. Build the seam; defer the actual purchase flow
  / price model until after the experience is built (David's call).
- **P7 (later) — Warm narration carve-out.** Deferred; separate decision.
- **P8 — ADAPTIVE subline trainer (David 2026-06-15).** One view that teaches /
  drills the DIFFERENT sublines of a single variation, adaptively — see the
  "Adaptive trainer" section below. The premium "train the variation" experience.
- **P9 (album 2) — Curriculum ACROSS courses** ("Beginner → Intermediate →
  Advanced" path).

## Adaptive trainer (David 2026-06-15) — "one view, different sublines for the same variation"

Two senses of "adaptive", both buildable on existing machinery, not exclusive:

1. **Board-adaptive (branching live tree)** — one view; the engine plays the
   realistic opponent deviations within the variation, and the course routes
   into + teaches the matching subline as it comes up ("they played h4 — here's
   how we meet it"). The "never out of book" experience made interactive. Reuses
   `OpeningPlayMode` (locked-to-line → adaptive Stockfish) but locked to the
   VARIATION's sub-tree instead of a single line; the subline set is the
   DB-derived branches.
2. **Learner-adaptive (SRS / weakness)** — the view cycles the variation's
   sublines, surfacing the ones the student is weakest on / due for review first
   (the "due today" pulse, scoped to a variation). Reuses `openingWeakSpots` +
   the flashcard/SRS layer.

**Rec:** build board-adaptive first (it's the novel, course-defining feel),
weight subline selection by the learner-adaptive signal. Pairs naturally with
DB-derived sublines (structural lines drill well even before deep narration).

### 🔒 LEARNER-ADAPTIVE MUST TIE INTO THE TRAINING LOOP (David 2026-06-15)

The learner-adaptive trainer is NOT a standalone drill — it READS FROM and WRITES
TO the app's existing training loop, closing the learning loop with no gaps
(per the "everything wired" audit doctrine). Concretely:

- **READS (which subline to drill next):** the same signals the Training Plan
  uses — `openingWeakSpots` (the student's weak lines), SRS-due cards, and the
  new/unlearned-line set. Reuse `buildTodaysReps()`'s sources
  (`TrainingPlanRolodexPage`) so the course surfaces the subline the student is
  weakest on / is due to review FIRST.
- **WRITES (results feed the loop back):** a drilled subline enrolls into SRS
  (the existing `markRungComplete` → SRS auto-enroll path), updates
  `openingWeakSpots` on misses, and so the course's sublines appear in
  "Today's Reps" — the course becomes part of the daily training agenda, not a
  separate place.
- **Net:** the training loop feeds the course (drill my weak Caro sublines
  today), and the course feeds the training loop (today's course misses become
  tomorrow's reps). Same SRS/weakness substrate the rest of the app already
  runs on — no parallel progress system.

## Decisions log (David, 2026-06-15)
- ✅ **Scope = FULL** — dedicated syllabus/contents screen in The Academy (the
  course front door), not a light skin on the openings page.
- ✅ **Home = The Academy tab** (second section alongside the audiobook).
- ✅ **Monetization = pay-per-class**, model settled AFTER it's built; build the
  per-course gating SEAM only.
- ✅ **Paywall line:** every variation FREE (all of them, never gated); the
  COURSE is the only paid unit = sublines + wrapper; buying unlocks the whole
  course.
- ✅ **Sublines = BOTH approaches, not either/or (David 2026-06-15).**
  - **DB-derived** builds the COMPLETE TREE FAST — every variation's sub-branches
    from the Lichess DB via the existing sibling/continuation machinery, fully
    grounded (G3). This is the FLOOR: the whole shelf reaches "complete, gap-free
    tree" quickly, every move carrying a grounded WHY (the absolute rule).
  - **Authored (deep-build grade)** is the CEILING — hand-built to masterclass
    standard (two-register narration, lead-the-eye arrows, sources, the
    prescriptive weapon-grade "why"), opening-by-opening, flagships first. The
    long content campaign per §G9.1.
  - DB-derived is NOT the endpoint — it's the fast floor that the authoring
    deepens over time. Both ship; the tree is complete now, the quality climbs.
- ✅ **Adaptive trainer = board-adaptive first, weighted by the learner-adaptive
  (weak-spot / SRS) signal.**
- ✅ **Pilot openings = the masterclass set** (richest data), then pro-reps, then
  DB-only.

## Remaining for David (later)
- Exact pay-per-class price model + purchase flow (after build).
- Does the Openings tab stay the free library long-term (recommended) or get
  absorbed into The Academy.

## Next-session pickup
Start at P1: `src/services/openingCourse.ts` + `openingCourse.test.ts`, pure
functions over `OpeningRecord` + `buildVariationTabs`. Everything else renders
off it.
