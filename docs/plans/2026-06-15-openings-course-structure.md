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
- **The why is GROUNDED, never invented (G0/G3) — a two-stage pipeline:**
  Stage 1 the CODE computes the why-facts (DB frequency / main-weapon %, Stockfish
  eval delta, concept-corpus idea, legality); Stage 2 a human hand-authors the
  narration FROM those facts. The engine supplies the why; the author supplies
  the elegance — neither invents. `explainBestMoveGrounded` / `groundedAnswer.ts`
  is the Stage-1 template. (Full detail in the Decisions log below.)
- ✅ **Why-source = ONE COMBINED PIPELINE, two stages (David 2026-06-15):**
  the engine COMPUTES the why, the human WRITES the narration from it — pure G0,
  nothing invented at either step.
  - **Stage 1 — code computes the grounded why-FACTS for every recommended move:**
    DB frequency / main-weapon status ("the main move, N% of masters"), Stockfish
    eval delta (holds the edge / refutes the deviation), concept-corpus idea tag,
    legality. A structured why-fact object per move. Exists day one for EVERY
    move (so nothing is ever empty), and IS the displayed why until authored.
  - **Stage 2 — human hand-authors the narration FROM those computed facts:**
    weapon-grade, two-register, personal voice — translating the facts into
    elegant prose ("the general understanding is the raw material; the elegance
    is my job"), NEVER inventing. The Stage-1 fact object doubles as the
    AUTHORING BRIEF (the author sees "main move 72%, engine +0.4, idea: undermine
    the base of the chain" and writes from it). Flagships first.
  - **Displayed why** = authored narration when present, else the Stage-1 grounded
    fact sentence. Both grounded; authoring is the elegance pass over the SAME
    facts. No-move-without-a-why is the gate.

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

### 🔒 Data-source decision — RESOLVED: FREQUENCY-DERIVED, precomputed (2026-06-15)
Sublines = real DB lines, NEVER invented (G3). Two approaches were tried:
- **Named-DB sub-variations** (`findSiblingExtensionBranches`) — REJECTED as the
  primary source: coverage is uneven/thin (probe: Najdorf=6 sublines, but Caro
  Advance=**1**) because it only surfaces *named* sub-variations, not every real
  opponent deviation. Can't deliver "answer every opponent move."
- **Frequency-derived from the masters DB** — ADOPTED. At each opponent-to-move
  node ALONG the variation spine (after the variation's *establishment ply* — the
  ply its ECO name first specializes, so we don't capture the system-level fork
  that IS another chapter), branch on every opponent move played in ≥ max(4, 2%)
  master games, walk each along the most-played continuation to the middlegame.
  Probe result: Caro Advance → 10 ranked sublines (h4/Tal 20%, O-O/Short 18%,
  Nc3/Van der Wiel 10% …). Forcing variations correctly get 0 (empty > invented).
- **Precomputed, NOT runtime:** the masters DB is a 37MB runtime *fetch* (not
  bundled), so a build script (`scripts/build-course-sublines.mjs`) emits a compact
  `src/data/course-sublines.json` (per opening → variation index → ranked
  sublines). Runtime `buildCourse` reads the small file; the 37MB DB never ships
  to the client.
- Each subline carries: `triggerMove`, `atPly`, `games`, **`pct`** (share at the
  node), `name` (ECO canonical), `moves` (to the middlegame), `reachesMiddlegame`.
- Authored masterclass-grade narration layers on top later (the combined-pipeline
  Stage 2); the frequency data is the Stage-1 why-fact + the authoring brief.

### 🔒 RANKING + FREQUENCY NARRATION (David 2026-06-15)
- **Tree is ranked most→least common** (sublines sorted by master games desc).
- **Narration states the %/count SELECTIVELY — only when it adds value**, never on
  every move (robotic). Good moments: the dominant try ("White's main move here,
  ~73%"), a rare-but-dangerous deviation ("you'll see this maybe 1 game in 20, but
  it bites"), a surprising even split. The `pct`/`games` ride in the Stage-1
  why-facts; the author/voice decides when to speak them (honors the G5 + voice
  rules: concrete, varied, silence is fine).

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
- **P9 — COURSE-SPARRING in /coach/play (David 2026-06-15).** When a PAID user
  (owns the course) plays the coach, the coach's OPENING BOOK = the student's
  course sub-tree: it plays the OPPONENT side of their repertoire and throws the
  real variations/sublines at them (weighted by weak-spots/SRS — the training
  loop), follows the course tree move-for-move through the opening, then hands
  off to adaptive Stockfish at the middlegame terminus. Misses feed the loop
  back. Free users → generic Stockfish opening (today's behavior). See section
  below.
- **P10 (album 2) — Curriculum ACROSS courses** ("Beginner → Intermediate →
  Advanced" path).

## 🔒 SUBLINE DEPTH — to the middlegame, not a move count (David 2026-06-15, confirmed)

A subline runs until the student is back in KNOWN TERRITORY — depth is variable by
line, set by the line's nature (sharp forced lines go deeper; quiet lines end
once the plan is clear). This is the app's existing law (G9.3 Gate B), so courses
inherit it. A subline ends at the FIRST of three honest stopping points:

1. **Transposes into the variation's main middlegame** → end at the transposition;
   inherit the main line's plan (no duplicate). Most quiet sublines.
2. **Reaches its own distinct middlegame** → end there; attach a short plan note.
   Terminus = `reachesMiddlegame(pgn)` (`src/data/variationMiddlegameDepth.shared.mjs`
   — ≥14 plies OR someone castled OR both sides developed ≥2 minors). REUSE this
   exact helper (single source the gate already uses); do NOT reinvent.
3. **Forces a clear resolution** (the opponent's deviation is a blunder we punish)
   → end at the refutation / clear advantage. This is the trap payoff.

Then at every terminus, hand off to the middlegame plan (G9.3 Gate C continuity),
and add an endgame layer only where the wider-corpus DATA shows a recurring ending
(G9.1 step 5; section self-hides otherwise). `findSiblingExtensionBranches` runs to
the DB line's END, so `buildSublines` TRIMS to the terminus via stopping points
1-3 (v1: stopping point 2 via `reachesMiddlegame`; 1 + 3 are refinements).

## Traps folded INTO the walkthrough tree (David 2026-06-15) — unifies sublines + punish-gems

A punish trap IS a subline where the opponent's deviation is a BLUNDER instead of
a reasonable try. Both are "opponent played X → your prepared answer." So fold the
punish trap lines into the course/walkthrough tree: the tree then covers EVERY
opponent option, sound and unsound = the literal "never out of book" promise, and
teaches the trap IN CONTEXT (at the move where it's available), not in a
disconnected section.

- **One tree, branches TAGGED:** sound-subline ("reasonable move → your plan") vs
  blunder-punish ("mistake → the refutation"). The contrast sharpens the "why".
- **Respect the trap taxonomy (CLAUDE.md):** only `trap` kind (forced tactical
  refutation) gets the bright "they blundered — punish!" framing; `mistake` /
  `theme` stay softer. Classify each folded branch correctly. Punish moves are
  already engine-verified (punish-gem tiering) → the why is grounded.
- **Gating:** inside a PAID course there's no internal gate (buying unlocks all),
  so traps just live in the tree. Keep a "weapons" highlight-reel index too (drill
  traps directly), but the PRIMARY home becomes the tree.
- **Synergy:** the coach (course-sparring) can walk into a trap and the student
  springs it live — the most motivating rep there is.

## Course-sparring — coach plays the course material (David 2026-06-15)

"If a student plays with coach I want coach throwing back the opening sequences."
The board-adaptive trainer, promoted from the opening page up to the full
`/coach/play` room.

- **Mechanism:** the coach's opening moves come from the subline engine
  (`buildSublines`, DB-grounded, never invented). It plays the OPPONENT side of
  one of the student's OWNED courses, picking which variation/subline to throw
  by the learner-adaptive signal (`openingWeakSpots` + SRS-due), follows the
  course tree move-for-move (generalize `OpeningPlayMode` from one line → the
  tree), then hands off to adaptive Stockfish (`coachPlaySession.resolveConfig`)
  at the middlegame terminus. Game misses write back to weak-spots/SRS.
- **Orientation (confirm w/ David):** coach plays the OPPONENT side so the
  student drills THEIR repertoire (student plays Caro as Black → coach throws
  White's tries). Possible flipped demo/refute mode is a later option.
- **Gating:** paid (owns course) → course-sparring; free → generic Stockfish.
  The coach itself becomes a paywall surface.
- **Reuses + respects locked contracts:** this is a NEW gated mode inside coach
  play (course-sparring), driven by the subline engine — it does NOT change the
  existing locked-line WLPP Play (in-page `OpeningPlayMode`) or the generic
  free-play behavior. It actually closes the "generic /coach/play wanders off
  the taught line" gap by bringing locked-tree play into the coach room for
  course owners.

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

## 🔒 BUILD PRIORITY — LOCKED (David 2026-06-15, "LOCK THIS IN")

Build it, but **lead with the VALUE, not the wrapper.** The value = a complete,
adaptive, never-out-of-book training layer the free app doesn't have. The wrapper
(syllabus/progress/finish-line) is the **delivery vehicle**, built alongside — NOT
the product. Two contingencies the whole thing rests on:
1. **The why on EVERY move is actually good** — engine-grounded (Stage 1), then
   hand-authored on flagships (Stage 2). A thin/auto-only why = it collapses into
   "more tiles." This is non-negotiable.
2. **The adaptive trainer is the HEADLINE**, not an afterthought.

**Build order (value-first):**
1. `buildSublines` — DB-derived deviation tree per variation, trimmed to the
   middlegame terminus (real subline DEPTH). ← FOUNDATION, in progress.
2. `computeWhyFacts` — Stage-1 grounded why per move (frequency + engine + concept).
3. **Adaptive trainer** (board-adaptive, learner-weighted, training-loop wired).
4. Course-sparring in /coach/play.
5. Traps folded into the tree.
6. Wrapper (syllabus / progress / finish line) — the delivery vehicle.
7. Hand-authored why on flagships (ongoing content pass).

## 💡 PARKED IDEA — proactive weakness-driven Learn-with-Coach (David 2026-06-15, "REMIND ME LATER")

David's tangent, to surface later (NOT this build, but don't lose it): when a user
plays **Learn-with-Coach**, the coach should play **openings the user has STUDIED**
— never generic. And with NO direction from the user, the coach **auto-picks what's
already identified as the user's WEAK area and trains them on it, unprompted** —
"if given no directions, picks what is already identified as weak and trains the
user on it without even being asked." A proactive, weakness-targeting coach. This
is the course-sparring idea (P9) generalized to the whole Learn-with-Coach surface,
driven by `openingWeakSpots` + SRS. Remind David when course-sparring lands.

## 🔒 ANTI-OPENING COURSES — either side, flip the student color (David 2026-06-15)

A course can be oriented from EITHER color — the position-based engine handles both
by just setting which side is the "student":
- **"Play the X"** = student plays X (Black's Caro repertoire); coach throws the
  opponent's tries.
- **"Beat X / Meet X"** = student is the other side, course RECOMMENDS a weapon vs
  X and drills every reply. (Existing "face mode" already flips studentSide.)
Two packagings: standalone "Meet the Caro" courses, OR chapters inside a broader
"1.e4 White repertoire" course ("vs the Caro", "vs the French", …). The ONLY extra
curation is PICKING the recommended weapon — the same prescriptive "we recommend X
because Y" decision the course concept already rests on. Engine unchanged; flip the
color, follow the (now-attacker) student's chosen system, branch on the defender.
🔒 **DECISION (David 2026-06-15): the FANTASY (3.f3) IS our recommended anti-Caro
weapon.** "If the Fantasy is good enough for Naroditsky to stand behind and teach,
it's good enough for us." GM-backed → not dubious; aggressive, out-of-prep, and the
poster child for the surprise-weapon thesis. Teach it at FULL depth (Naroditsky's
content as the voice corpus; lines DB- + engine-grounded). This SUPERSEDES the
earlier "anti-Caro = Advance/Two Knights, not Fantasy" note — that was too
conservative. Anti-French recommend = the Advance (3.e5).

**The clean generalization (David 2026-06-15): a COURSE = rooted at ANY position +
a student color + a recommended system.** The root is just a FEN/short prefix, so
one structure subsumes everything:
- Rooted at the START, student White → a full "1.e4 (or 1.d4) White repertoire."
- Rooted after **1.d4, student Black** → "vs the Queen's Pawn as Black, we
  recommend [the Nimzo/QGD complex, or the KID]" — a defensive repertoire BY THE
  OPPONENT'S FIRST MOVE.
- Rooted after 1.e4, student Black → the e4-defense repertoire (Caro/French/…).
- Rooted at a named opening → the single-opening course.
All the same FEN-walk: set the root + color, follow the student's recommended
system at student-to-move plies, branch on the opponent at opponent-to-move plies.
"Anti-opening" and "defensive repertoire by first move" are just different roots.

## 🔒 COURSE / WEAPON NATURE TAG — principled vs SURPRISE (David 2026-06-15)

David: "surprise and off beat is how you catch an opponent out of prep." Correct —
offbeat ≠ inferior. Catching someone out of book is a real, separate practical edge
(they burn clock, they're on their own, an unfamiliar position beats a half-pawn).
Tag the NATURE of a course/weapon:
- **Principled / main-line** — objectively best, bulletproof.
- **Surprise / out-of-prep** — offbeat, practically nasty, drags them off book
  (Fantasy Caro, Smith-Morra, sideline gambits). Honest sub-label: "practically
  excellent, objectively a hair worse."
The COURSE is what makes a surprise weapon work — you know 15 moves of prepared
venom, they guess on move 5. "Surprise Weapons" is its own sellable shelf. Earlier
note's "don't recommend the Fantasy" was wrong-framed: it's not a MAIN-LINE pick,
but it's a legitimate SURPRISE pick — tag it, don't dismiss it. (The engine eval +
frequency still ground the "objectively a hair worse" honestly.)

### 🔒 "DEVASTATING ANTI-OPENINGS NO ONE SEES" — a flagship, and it's COMPUTABLE (David 2026-06-15)

David: "we want devastating anti openings that no one ever sees." This is a
flagship shelf — and it's the punish-gem doctrine lifted to OPENING CHOICE, so it's
GROUNDED, never invented (G3):
- **"No one sees it" = low frequency** — `masterPlayLookup` game counts quantify
  rarity. Pick lines few play.
- **"Devastating" = engine-verified** — the OPPONENT'S most-common (autopilot)
  reply has a negative eval delta into OUR prepared punish (Stockfish). The gold:
  rare line × opponent's modal reply is an inaccuracy × we have the refutation.
- **Falls out of the FEN-walk for FREE** — frequency + per-move eval are already
  computed; flag a line "surprise weapon" when freq low AND opponent-top-reply
  eval-delta negative-for-them. No new machinery.
- **Honesty rail:** "devastating" is conditional on them being out of prep and
  playing the natural move (= the premise). Against someone who KNOWS it, it's
  offbeat-equal. The course makes YOU the one who knows it cold. Tag honestly with
  rarity + the trap + the eval-when-they-play-natural — devastating AND true.
- The surprise-weapon finder = the punish-gem miner pointed at opening choice.

## 🔒🔒 CORE PRINCIPLE — IT IS ALL POSITION-BASED / FEN-KEYED (David 2026-06-15, emphatic)

The entire engine is keyed on POSITION (FEN), never move-names or PGN strings.
This is THE architecture, and it unifies everything:

- **One primitive: `masterPlayLookup(fen)`** (FEN-keyed, returns moves played at
  the position WITH game counts). At each node:
  - STUDENT-to-move → follow the top move by games = the recommended reply; the
    "played in N% of games" IS why-fact #1, for free.
  - OPPONENT-to-move → every move above a threshold = a subline branch.
  - Stockfish eval per move = why-fact #2.
- **The subline-tree walk and `computeWhyFacts` COLLAPSE into ONE FEN walk** — not
  two systems. One traversal yields the tree AND the grounded why together.
- **Transpositions solve themselves** — different move orders reaching the same
  FEN share a node automatically (huge for repertoires; a name/PGN tree can't).
- **"End where theory ends" is free** — when `masterPlayLookup` returns few/no
  games at a FEN, you've left book = a natural terminus (complements
  `reachesMiddlegame`).
- The Lichess opening DB (`openings-lichess.json`) still supplies NAMES/labels for
  nodes (via `detectOpening`/`findOpeningByPgnPrefix`) and the G3 "is this a real
  line" check, but DISCOVERY + frequency + branching are FEN-driven via master-play.

**Engine restated:** walk by FEN — master-play data gives the branches + the
frequency-why, Stockfish gives the eval-why, follow the main move for the student,
branch on the opponent's, stop at the middlegame / end of theory. `buildSublines`
v1 (name-based) is replaced by this FEN walk (async; merges in the why-facts).

## 🚨 EMPIRICAL FINDING — subline discovery must be POSITION-based, not name-based (2026-06-15 probe)

Probe of `buildSublines` v1 (named-branch primitive `findSiblingExtensionBranches`):
- Caro Advance → **1** subline (Van der Wiel Attack only).
- Italian Game → **0** sublines.
Cause: `findSiblingExtensionBranches` only matches DB sub-variations *comma-named*
under the EXACT canonical name, but the DB mostly uses COLONS ("Italian Game: Two
Knights Defense", not "Italian Game, …"). Too thin for the locked "real depth".

**Fix (next build step):** subline discovery = POSITION-based DB-tree walk —
`findContinuationsAtPly(prefix)` finds EVERY DB continuation at a position
regardless of naming. Walk the sub-tree under the variation: at STUDENT-to-move
plies follow the recommended (main) reply; at OPPONENT-to-move plies BRANCH into
each DB continuation (= a subline trigger); extend each along the DB to the
middlegame terminus. Needs the student color (ply parity) → `buildSublines` takes
the opening's color. v1 (`pgnToSans` + named-branch) is committed as the floor;
the position-based walk replaces the discovery step.

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
