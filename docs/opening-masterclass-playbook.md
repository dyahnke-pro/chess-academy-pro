# Opening Masterclass — Build Playbook

**Read this before building ANY new opening masterclass.** The Ruy Lopez
(`ruy-lopez`) is the reference build — every rule below was forged on it
(David, 2026-05-21). The wiring is opening-agnostic and DONE; building a
new opening = **author the data, and the page lights up.** The hard part
is curated content, not code.

---

## 0. The non-negotiable ethos

1. **NO ALGOS decide what goes on a tab. David hand-picks everything** —
   which variations are tabs, which plans, which traps, the routing. Code
   never "matches" content onto a tab. The curator chooses; code only
   filters by the hand-picked list.
2. **G3 — never invent chess.** Every move / FEN / line comes from
   `openings-lichess.json` or is chess.js-validated. NEVER author moves
   "from book knowledge" or memory. If a line isn't in the DB, verify it's
   legal AND that it's real established theory before it ships. The LLM
   writes **prose only** (narration), never moves or structure.
3. **Don't pad.** Teach each variation through its REAL identity. A missing
   shelf (no trap, no endgame) is CORRECT when that variation hasn't got a
   characteristic one. Forcing generic content (a Lucena lesson, an
   auto-mined "Pin #3") is the cardinal sin. Empty > generic.
4. **Translate, never dump.** No raw explorer percentages, no SAN read
   aloud as letters, no engine jargon. Plain English always.

---

## 1. Page structure (already wired — inherit it)

- The opening detail page (`OpeningDetailPage.tsx`) IS the template. New
  openings get it for free.
- **Variation tabs** (`VariationTabs.tsx` / `buildVariationTabs`): gold
  glow — selected = full glow, others = glow on left+bottom edges. A
  leading **"Main line"** pill is the default. Curated set per opening
  (Ruy → 7); other openings auto-list all their variations.
- **Full-page rescope per tab**: selecting a tab re-scopes title, overview,
  key ideas, book reader, middlegame plan — all of it.
- **URL is the source of truth** for the selected tab: `?line=<label>`
  (e.g. `/openings/ruy-lopez?line=berlin`). Deep-linkable from anywhere.
- WLPP grammar everywhere: **Watch / Learn / Practice / Play** on every
  teachable line. Main-line Play navigates to `/coach/play`; variation
  Play mounts `OpeningPlayMode` in-page.

## 2. Per-variation content checklist

For each first-class variation tab, author:
- **4 key ideas** — student-side plans (the side you actually play). Hand-
  written, stored as `keyIdeas` on the variation in `repertoire.json`.
- **Overview** — the variation's `explanation` (fuller authored copy later).
- **A middlegame plan** — `mp-<openingid>-<label>`, a real DB line into the
  structure, hand-narrated. Builder: `scripts/add-ruy-*-plans.mjs`.
- **A Watch/Learn beat-lesson** — `RUY_VARIATION_LESSONS`-style
  `LessonScript`, white-oriented, narrated.
- **An endgame** — ONLY if the line has a genuine, characteristic one
  (see §4). Routed via the hand-picked plan table (`ruyMasterclassTabs.ts`).
- **Traps** — ONLY real named ones that genuinely arise (see §3).

## 3. Weapons (traps) rules

- Two arrays: `trapLines[]` = student WEAPONS (opponent slips → you punish,
  PGN ends with student better); `warningLines[]` = anti-traps (YOU slip →
  punished, PGN ends with student worse). Orientation is a hard contract.
- **Only real named traps**, hand-picked, DB-grounded. NO auto-mined
  generic ("Discovered Attack #1") junk.
- **Per-variation routing is hand-curated** via an `appliesTo` map
  (sidecar, keyed `<openingId>::<trapName>`). Code filters by it; no
  matching logic.
- **Remove traps that can't occur** in a variation. (Ruy: Noah's Ark needs
  the b3-bishop on b3 + …c5-c4 — impossible once Bc2 is played, so it's
  MAIN-line only, never Breyer/Chigorin/Zaitsev/Marshall/Open/Berlin.)
- **Narration pattern — warnings: show the trap, then snap the board back
  to the avoiding move.** "…c4 cages the bishop — gone. Now rewind: Bc2 and
  the cage never closes." Weapons: show the slip → play the punishment to
  winning material (no rewind; here you WANT the line).
- **Connect weapons ↔ plans.** The maneuver that prevents a trap (Bc2 =
  Noah's Ark antidote) is taught as ONE idea: the danger and its prevention
  together. Weave the "this maneuver dodges that trap" line into the plan
  narration.

## 4. Endgame rules

- **Only genuine, line-specific endgames.** Exchange → kingside-majority
  K&P; Berlin → queenless ending; Open → activity/d5-vs-e5. A real deep DB
  line into the characteristic structure, narrated to teach where it heads.
- **Where two structures overlap, the narration carries the difference.**
- **General endgame technique (Lucena, opposition, Philidor) does NOT
  belong on opening tabs** — that lives in the endgame trainer. Bolting it
  on is padding.
- **Deep-middlegame-into-endgame**: the line runs DEEP into the structural
  moment; narration teaches the ending it produces. (Builder pattern:
  `scripts/add-ruy-*-endgame-plan(s).mjs`, replayed from the start FEN.)
- **It's fine for a sharp gambit/attacking line to have NO endgame**
  (Marshall: its deep content is the only-move defense). Don't fabricate.

## 5. Narration rules (apply to every spoken line)

- **Model games**: reinforce the lesson's KEY PRINCIPLES at keystone
  moments + pause to appreciate the BEAUTY — NOT move-by-move. Vehicle =
  `criticalMoments` (moveNumber/color/fen/annotation/concept/highlights/
  arrows). Voiced via the viewer.
- **Lessons/walkthroughs**: keystone narration; silence is fine for routine
  moves. No acknowledgments ("Great move!"), no first-person, no interface
  references. The position teaches, not a tutor character. (See the
  Narration Voice Rules in CLAUDE.md.)
- **Highlight the pieces/squares as they're named — lead the eye. NON-
  NEGOTIABLE, every played sequence (David 2026-05-21).** The arrows +
  highlights move the user's eyes so they listen to the words instead of
  hunting for pieces and angles. This applies to lessons AND **middlegame
  plans (playableLines)** AND model games — NOT just beats. Naming a square
  in the narration with nothing pointing at it is a defect (it's what made
  the middlegame-plan WATCH "shitty work" — bare move-arrows, no vision to
  the squares named). Author per-move arrows+highlights matching each
  annotation; a played line without them is NOT done. (Arrows must
  originate on a non-pawn piece with a clear sight-line — `lessonIntegrity`
  enforces it.)
- **Voice-first** (Polly TTS) everywhere; respect the verbosity contract
  (silent/brief/full — G5). Book passages get the descriptive-notation
  scrub (`scrubDescriptiveNotationForSpeech`) for speech only.

## 6. Reading — the book reader

- Audiobook with **Opening / Middlegame / Endgame chapter tabs**.
- **Paginated**: one passage per page, bottom pager = back arrow · "1/4" ·
  **gold forward arrow**, swipe to turn, auto-turns to follow the
  narration. (`BookReader.tsx` + `useProseReader`.)
- Tap any paragraph to listen from there; speaker icon relistens one.
- Per-variation book passages need real extraction from the source books
  (keyed per variation); opening-level shared reading is an acceptable v1.
- `ListenableProse` brings the same Listen control to any prose surface.

## 7. The tools ("the money") — wire into ALL play surfaces

When built, these augment EVERY play surface (opening Play tab,
Play-with-Coach, middlegame/endgame Play, Practice) — NEVER a silo:
- **Masters explorer** (`/api/lichess-explorer`, master-play pipeline):
  real master moves, in plain English (popularity vs W-D-L score, always
  show game count). A bubble on the practice board + a "guess the move" drill.
- **Discussion Practice**: you play, coach asks "why did you play that?",
  you answer (voice/text), it's logged to Weaknesses as a TAGGED
  misconception (fixed vocabulary → drillable), coach replies with the
  masters' move + a why. Trigger = off-book AND worse (layered: explorer in
  book → Stockfish after). Live play is gated/skippable; review is exhaustive.
- **Game Review**: auto "where you left the book" marker; full-game coach
  discussion; reasoning capture at every blunder → same weakness bucket;
  deep-link back to the masterclass tab.
- **Training Plan = the hub**: weakness tags → today's reps. Weakness-first
  → SRS-due → new lines (weighted shares). New/unlearned lines never count
  against you (no penalty until learned). Drill formats: weakness drills,
  SRS reps, woodpecker rapid-fire, masters guess-the-move, replay-your-loss.
- **Eval bar**: NOT a live bar in walkthroughs (removed for chop) — on-demand
  only.

## 8. Onboarding (the "i" help)

- An "i" top-right on every page → coach-narrated, spotlighted coach-marks
  that explain WHAT each area does and WHY. Auto-run first visit, replayable
  after. Reusable `PageHelp`. Teach features when they first matter +
  empty-states-as-teachers. Teach THE LOOP (learn → play → capture → drill).

## 9. Audit (the gate)

- **EVERY FUNCTION, EVERY ANGLE, PROGRESSIVELY HARDER (David 2026-05-21,
  emphatic).** The loop is NOT allowed to be "the same 3 tests" each
  round. Hard requirements:
  - **Total coverage** — every single function of the build must be
    touched and tested: Watch, Learn, Practice, Play on the main line AND
    every variation tab; middlegame plans; key ideas; traps/warnings;
    model game; book reader; the deep-link/`?line=` routing; the money
    surfaces (Discussion Practice slip→why→tag, Game Review capture,
    Today's reps). Nothing untested.
  - **Different every round** — each round asks DIFFERENT questions and
    probes from DIFFERENT angles; do not repeat the prior round's checks
    verbatim. Rotate the scenarios.
  - **Progressively harder** — round N+1 digs deeper than round N
    (canonical happy path → off-canonical input → cold cache → pick-
    before-load → out-of-order → adversarial/edge). Escalate.
  - **Multiple questions per run** — each round asks several distinct
    questions of each surface, not one.
  This is the bar the loop must MEET before "3 consecutive clean rounds"
  counts for anything. (The current fixed P1–P6 probe set is the floor,
  not the ceiling — it needs the rotating/escalating probe bank built on
  top before it satisfies this rule.)
- `scripts/audit-openings-interactive-loop.mjs`, scoped to the opening
  (`AUDIT_ONLY_OPENINGS=<id>`): require **3 consecutive clean rounds**.
- **THREE INSTRUMENTS, always used together (David's rule):**
  1. **Playwright** — drives the live UI (taps, types, navigates,
     asserts the DOM) via the pre-installed Chromium
     (`scripts/audit-lib/chromium.mjs`). This is the "did the surface
     work" layer.
  2. **The live audit stream** (G2) — captures every `logAppAudit()` the
     app emits during the run. In the sandbox the loop intercepts the
     POST bodies via `page.on('request', …)`; against prod, pull
     `GET /api/audit-stream?since=<ms>` with the `x-audit-secret` header.
     This is the "what did the app actually do internally" layer (brain,
     navigation, tool calls, errors).
  3. **The listener tool** (`scripts/audit-lib/audit-listener.mjs`) —
     captures the voice narration as it fires (text, order, verbosity).
     This is the "did it speak, and say the right thing" layer.
  All three on every run — DOM behavior + emitted events + voice. A green
  Playwright pass alone is NOT a clean round; the audit-stream and the
  listener must be inspected too.
- Run vs a local dev server with the pre-installed Chromium
  (`scripts/audit-lib/chromium.mjs`).
- **USE THE LISTENER TOOL to audit the voice narration** (David's rule).
  The narration Listener (`scripts/audit-lib/audit-listener.mjs`, wired
  into the loop) captures the narration as it fires — the exact text
  queued to TTS, the firing, the order, the verbosity gating. That is how
  voice narration gets audited: it verifies the CONTENT and the FIRING of
  every spoken line, even though the audio render itself can't be heard
  headless. Run the loop WITH the listener on every masterclass audit and
  inspect what it captured — silence where a keystone should speak is a
  bug (this is exactly what would have caught the ModelGameViewer
  never-calls-voiceService bug). Division of labor: the **narration
  accuracy gate** checks the text is true to the board; the **listener**
  checks it actually fires in the running app; **David's ear on prod**
  checks it sounds good.
- **Voice / walkthrough AUDIO playback can't be heard headless** (the
  sandbox blocks Polly/LLM) → G7: route the audio-quality check to David
  on prod, and have the loop SKIP (not fail) the audio-render probes (the
  listener still audits content+firing). Probes must match the live UI
  (Learn → `lesson-player` when an authored lesson exists, else
  `drill-mode`; main-line Play → `/coach/play`; tab selection is
  URL-driven; generous mount timeouts).

## 10. Plumbing that scales

- **`reconcileBaseRepertoire`** (dataLoader): bump `BASE_DATA_REVISION` when
  `repertoire.json` content changes so edits reach already-seeded devices
  (preserves per-user progress). Same idea reconciles plans / pro-reps.
- **Builder scripts are the authoring toolkit** — `add-ruy-*-plans.mjs`,
  `add-ruy-variation-keyideas.mjs`, `add-ruy-*-endgame*.mjs`,
  `narrate-capablanca-marshall.mjs`. Copy the pattern: hand-author the
  prose, replay the line through chess.js for legality + arrows, refuse to
  write on an illegal move. Validate with the planner / lessonIntegrity
  tests before shipping.
- **Per-opening process**: (1) curate the first-class variation tabs, (2)
  per variation author key ideas + a DB-grounded plan + traps/endgame where
  genuine, (3) the wiring auto-surfaces it, (4) audit to 3 clean rounds.
  Each opening gets faster as the toolkit hardens.
