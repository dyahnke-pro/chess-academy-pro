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
5. **NO BLANK / EMPTY SECTIONS OR TABS ON THE MASTERCLASS (David
   2026-05-21, LOCKED).** A section renders ONLY when it has real content
   for the current opening/tab — never an empty card, never a "0 items"
   shell. Two specific consequences of this rule:
   - **The standalone Model Game section is SCRAPPED** (removed from the
     opening tab). Model-game teaching, when a real student-side win is
     ever sourced, lives inside Watch — not its own often-empty section.
   - **The standalone Weapons / "traps" section is REMOVED.** Keep only the
     **"watch out for"** warnings (the anti-traps), and only render that
     when the current tab actually has one. No empty trap zone.
   Every other zone (key ideas, middlegame plans, endgame, book reader,
   warnings) must self-hide when it has nothing for the current tab.

---

## 1. Page structure (already wired — inherit it)

- The opening detail page (`OpeningDetailPage.tsx`) IS the template. New
  openings get it for free.
- **Variation tabs** (`VariationTabs.tsx` / `buildVariationTabs`): gold
  glow — selected = full glow, others = glow on left+bottom edges. A
  leading **"Main line"** pill is the default. Curated set per opening
  (Ruy → 7); other openings auto-list all their variations.
- **Tab order is LOCKED to amateur frequency — most-played to least
  (David 2026-05-21).** Once the first-class variations are hand-picked
  (§0.1), they are SORTED by how often the lines actually arise at the
  level the user plays at — not by gut feel and not by "elite theory
  importance." This is a single-user app for an amateur; the masterclass
  should prepare him for what he'll actually face on the board.
  - **Data source:** the Lichess Explorer API
    (`explorer.lichess.ovh/lichess`) at 1600+ rating, blitz/rapid/classical.
    Authenticated with the Lichess PAT in per-project memory for the 4
    req/sec rate. Query the position after the variation's defining move
    and read off the move-frequency split. Masters DB is also worth
    checking, but the AMATEUR DB is the default for tab order.
  - **Procedure when building a new masterclass:**
    1. Hand-pick the first-class variations (per §0.1).
    2. Query the explorer for each variation's defining move's frequency.
       Show the user the masters vs amateur numbers so they can see the
       difference (Vienna example — masters put 3.g3 Paulsen at 35%; at
       amateur level Paulsen is 4.2% and the Vienna Gambit's 3.f4 dominates
       at 32%).
    3. Sort the curated list by amateur frequency, most-played first. The
       "Main line" pill stays the canonical showcase (e.g. Ruy = Closed,
       Vienna = Classical) — it is NOT in the frequency sort; only the
       variation tabs that follow it are.
  - This rule was forged on the Vienna build (2026-05-21). The Vienna's
    audience-correct tab order (Classical pill → Gambit → vs 2…Nc6 →
    Frankenstein-Dracula → Paulsen) is opposite to the masters-frequency
    order. The amateur lens is what matters for this app.
- **Full-page rescope per tab**: selecting a tab re-scopes title, overview,
  key ideas, book reader, middlegame plan — all of it.
- **URL is the source of truth** for the selected tab: `?line=<label>`
  (e.g. `/openings/ruy-lopez?line=berlin`). Deep-linkable from anywhere.
- WLPP grammar everywhere: **Watch / Learn / Practice / Play** on every
  teachable line. See §1a for the LOCKED definition of each verb.

## 1a. The WLPP grammar — LOCKED definitions (David 2026-05-21)

These four verbs mean the SAME thing on every teachable unit — the main
line, every variation tab, trap **weapons**, "watch out for" **warnings**,
AND the middlegame plans. Get them right; I had them wrong before.

- **Watch** — the board plays itself with the narration. Hands-off auto-play:
  the masterclass teaching, voice-gated beats, board animates. (Lessons →
  `LessonPlayer`; middlegame plans → `PlayableLinePlayer` mode `'watch'`
  demo; named traps → the beat lesson via `LessonPlayer`.)
- **Learn** — the voice GUIDES you move by move: it speaks each move's idea
  and shows the move + its lead-the-eye arrows/highlights, and YOU play it on
  the board. NOT a second auto-play. (`PlayableLinePlayer` mode `'learn'`.)
  The old bug: Learn just re-played the Watch lesson — that is WRONG.
- **Practice** — the SAME board as Learn but SILENT: no voice, just a **Hint
  button** that reveals the move arrow on demand. You replay from memory.
  (`PlayableLinePlayer` mode `'practice'`.)
- **Play** — Play-with-Coach with THIS opening/line **locked in** so the
  coach plays it and can't wander into a random opening (sets
  `intendedOpening` / mounts `OpeningPlayMode` for the line). Main-line Play
  may hand to `/coach/play` with the opening declared; variation/trap Play
  mounts `OpeningPlayMode` in-page from the line.

One player serves Watch/Learn/Practice over a `{fen, moves, annotations,
arrows, highlights}` line; a PGN/beat-lesson is converted into that shape
when needed (see §3 the trap converter). Plans with no playable line fall
back to the study / free-practice surfaces.

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
- **Reality check on counts (student-side).** A trap is a WEAPON only when
  the OPPONENT slips and YOU punish. In a White opening only the lines where
  Black blunders are weapons; lines where YOU must avoid a slip are warnings.
  The Ruy has exactly ONE true weapon (Tarrasch); Noah's Ark / Mortimer /
  Fishing Pole / Marshall-only-move are all warnings. But **weapon count is
  opening-specific — some openings are weapon-rich and that richness IS their
  identity.** The Vienna, for instance, ships 5-7 named weapons (Wurzburger,
  Hamppe-Allgaier, Hamppe-Muzio, Frankenstein-Dracula Nxa8, Copycat Qg4,
  Pierce Gambit, Steinitz Gambit) — that arsenal is the WHOLE PITCH of the
  opening. Don't cap a weapon-rich opening at the Ruy's "expect few"
  cadence; surface every named weapon that's real, DB-grounded, and hand-
  authorable. Classify by who plays the punishing move, not by how famous
  the trap is.
- **FULL COVERAGE on weapons — NO SHORT NARRATIONS (David 2026-05-21,
  LOCKED).** Each named weapon gets a FULL multi-beat teaching, not a
  3-beat skim. Same depth as the masterclass variation lessons — set up the
  position, name the threat, show the slip, walk the punishment move-by-
  move with the WHY of each move, show the safe alternative (warning) or
  the resulting better position (weapon), and tie it back to the opening's
  identity. Target ~6-10 beats per weapon, ~5-8 minutes lesson time
  (compare the Ruy's 3-beat trap lessons — those were RUY-appropriate
  because each Ruy trap is one short tactic; weapon-rich openings get
  fuller treatment per weapon). The reason: if the opening's identity IS
  its arsenal, abbreviating each weapon undersells what the masterclass
  exists to teach. Each weapon must stand on its own as a real lesson, not
  a chip. Empty > generic > abbreviated.
- **Named traps are hand-authored beat-lessons, NOT data tiles.** Pattern:
  `src/data/lessons/ruyTrapLessons.ts` — a `LessonScript` per trap + a
  `RUY_TRAP_DEFS` routing table (`{id, name, kind:'weapon'|'warning',
  appliesTo:[tab labels]}`) + `getRuyTrapsForTab(tabKey)`. The page renders
  weapons in the Weapons zone, warnings in Pitfalls, filtered by the current
  tab. (`repertoire.json` trapLines/warningLines stay EMPTY for an opening
  whose traps are hand-authored this way — don't double-source.)
- **WLPP on every named trap.** Each trap tile gets the full 4-button row:
  Watch = the beat lesson (untouched); Learn/Practice = the trap's CORRECT
  teaching line played via `PlayableLinePlayer`; Play = coach locked to the
  opening. The lesson→line **converter** (`getRuyTrapPlayableLine`) takes the
  LAST beat (the punish for a weapon, the antidote move for a warning) as the
  line and carries each prefix beat's `say` text onto its move VERBATIM. The
  trap-branch beats (the wrong moves) stay Watch-only — nothing lost, the bad
  moves just aren't drilled.
- **Narration carries over verbatim through the converter** (it copies each
  prefix beat's `say` onto its move unchanged). `lessonIntegrity.test.ts`
  asserts this. NOTE: the "did the narration survive?" worry was a one-off
  caused by a bad MERGE that dropped content — it is NOT an ongoing design
  hazard, so don't treat "narration survival" as a standing doctrine. The
  gate is cheap, so it's kept as a safety net; that's all.

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

- **A MODEL GAME PER VARIATION, each showing the STUDENT'S SIDE WINNING
  (David 2026-05-21, LOCKED: "find a model game for each variation").** Every
  first-class variation tab gets its OWN model game — a real classic where the
  student's side WINS in that exact variation. A Black-oriented class (Pirc,
  etc.) needs beautiful BLACK wins; a White opening needs White wins. NEVER a
  game where the opening loses (the Pirc's old Kasparov–Topalov was a White
  win AGAINST the Pirc — exactly wrong, scrapped). **Source real games; never
  fabricate a PGN** (G3). The render guard enforces it: `ModelGamesSection`
  drops any game where the student's side lost. Sourcing rule:
  - Search the web to IDENTIFY the game (players, event, year, result,
    variation) — confirm it's a real win for the student's side in that line.
  - Get the FULL verified PGN before authoring — from a fetchable source, or
    pasted by David. The major chess sites (chessgames.com, chess.com) 403 the
    sandbox's web-fetch, so the PGN often has to come from David or an open
    mirror. Do NOT reconstruct moves from memory to fill the gap.
  - Reference find (Pirc · Austrian Attack): **Fischer 0–1 Korchnoi, Curaçao
    Candidates 1962 (B09)** — Black beats Fischer himself in the Austrian
    Attack. Verified real; PGN pending a fetchable source.
  - Until a variation's real win + PGN is in hand, that variation simply has
    no model game (the section self-hides — empty > losing > fabricated).
- **Model games**: reinforce the lesson's KEY PRINCIPLES at keystone
  moments + pause to appreciate the BEAUTY — NOT move-by-move. Vehicle =
  `criticalMoments` (moveNumber/color/fen/annotation/concept/highlights/
  arrows). Voiced via the viewer. Author them with the lead-the-eye colours
  (§5a) and the sentence-grained reveal where the viewer supports it.
- **Lessons/walkthroughs**: keystone narration; silence is fine for routine
  moves. No acknowledgments ("Great move!"), no first-person, no interface
  references. The position teaches, not a tutor character. (See the
  Narration Voice Rules in CLAUDE.md.)
- **Highlight the pieces/squares as they're named — lead the eye. NON-
  NEGOTIABLE, every played sequence (David 2026-05-21).** The arrows +
  highlights move the user's eyes so they listen to the words instead of
  hunting for pieces and angles. Applies to lessons AND **middlegame plans
  (playableLines)** AND model games — NOT just beats. Naming a square in the
  narration with nothing pointing at it is a defect. A played line without
  lead-the-eye markers matching its narration is NOT done.

### 5a. The lead-the-eye COLOUR LANGUAGE — LOCKED (David 2026-05-21)

Three meanings, three colours. Fewer colours = less clutter; David cut the
original 4-colour scheme (separate green move-arrow + amber vision + cyan
piece) down to this:
- **ORANGE** = the move just played — its two squares (from + to). This
  REPLACES the move arrow; there is no separate "move arrow" any more.
- **GREEN** = vision arrows — what a piece is looking at (piece → target).
- **YELLOW** = a key square the narration is calling out.

For the live coach the ARROW colours stay engine-rank (green=#1, blue=#2,
yellow=#3, red=threat) because that serves live play; the TEACHING
**highlight** colours match the lessons (yellow=key square, green=praised
piece/square, red=weakness/target). Coach knows this via `envelope.ts`
TEACH_MODE_ADDITION.

### 5b. The lead-the-eye GENERATION ALGORITHM (per move, deterministic)

`scripts/add-leadeye-to-plans.mjs` is the reference. Per move in a line:
- **Vision arrows (green):** for every square the annotation NAMES, if a
  named piece (or the piece that just moved) has a CLEAR legal sight-line to
  it, draw a green arrow. Verify with chess.js `sees()`/`clearRay()`; a
  blocked ray is SKIPPED, never faked. Cap ~2 so the board stays clean.
- **Highlights:** the move's from+to squares ORANGE; every other named key
  square YELLOW. Cap ~6, deduped.
- **The gate (`middlegamePlanner.test.ts`):** every vision arrow must be a
  legal sight-line AND grounded — every highlight + every vision-arrow
  endpoint must be a square the annotation actually NAMES (bare `f5` or
  piece-token `Nf5`). Only the orange move-squares are exempt (they ARE the
  move). Run it; a played line that fails grounding is not shippable.

### 5c. SENTENCE-GRAINED REVEAL — squares light as they're spoken, NOT TTS

David: "we turn that [TTS-timing] off and use beats." Narration is
voice-gated beats; the TTS engine does NOT drive timing. To make a square
light up as its name is spoken WITHOUT choppy audio:
- Speak the beat's narration ONE WHOLE SENTENCE at a time (sentences are
  natural prosodic units — they don't sound chopped), **prefetch the next
  sentence** so the seam stays small.
- Reveal each arrow/highlight when the SENTENCE that names its square is
  spoken. Voice-off → reveal everything immediately (no narration to gate).
- Mechanism: `src/services/narrationSegments.ts`
  (`buildNarrationSegments` + `speakSegments`), wired into `LessonPlayer`
  (the player filters its board markers by the revealed set). Reuse it for
  any new narrated player; do NOT reach for TTS word-boundary events.
  CAVEAT (G7): per-sentence audio PACING can't be judged headless — route
  the "does it sound smooth" check to David on prod.
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
- **KNOW WHERE THE DATA IS READ FROM (don't ship to the wrong place).**
  Middlegame plans render from **Dexie** (`db.middlegamePlans`, via
  `getPlansForOpening`), re-seeded from `middlegame-plans.json` on EVERY boot
  (`loadMiddlegamePlansData` bulkPut — idempotent, carries no user progress).
  So plan edits reach devices automatically. Named traps render from the
  **static import** (`RUY_TRAP_DEFS`), so they ship in the bundle. The
  opening detail page reads `playableLines` straight from the static JSON
  import in some paths and Dexie in others — when content "isn't showing,"
  check which path the surface reads before assuming a bug.
- **The gate roster — run these before shipping any opening's content:**
  - `middlegamePlanner.test.ts` — plan lines legal + annotations 1:1 + the
    lead-the-eye legality/grounding gate (§5b) + correct orientation.
  - `lessonIntegrity.test.ts` — beats legal, arrows originate on a non-pawn
    with a clear sight-line, white-orientation for white openings, AND the
    named-trap narration-survives-the-transition check (§3).
  - `narrationAccuracy.test.ts` — every "<square>-<piece>" claim is grounded
    on the board (colour-agnostic; extend it to the new opening).
  - Black openings get their OWN orientation test (`pircIntegrity.test.ts`
    asserts `'black'`); do NOT add black lessons to the Ruy white-orientation
    array.
- **Interactive audits (G7) for the new content:**
  - `scripts/audit-leadeye-plans.mjs` — middlegame-plan Watch/Learn/Practice,
    both orientations: highlights paint, vision arrows render, modes mount.
  - `scripts/audit-named-traps.mjs` — named-trap WLPP on the correct tab,
    Watch narration intact, Learn/Practice mount, Hint reveals the move.
  - `scripts/audit-openings-interactive-loop.mjs` (`AUDIT_ONLY_OPENINGS=<id>`)
    — the full §9 loop to 3 clean rounds.
  Note react-chessboard v5 applies `squareStyles` to an INNER child div, not
  the `[data-square]` element — a highlight-paint probe must scan descendant
  div styles, not the square element.
- **Per-opening process**: (1) curate the first-class variation tabs, (2)
  per variation author key ideas + a DB-grounded plan (with §5a/§5b
  lead-the-eye) + traps/endgame where genuine, all WLPP-wired (§1a), (3) the
  wiring auto-surfaces it, (4) a real model game for the student's side if one
  exists (§5), (5) run the gate roster, (6) audit to 3 clean rounds. Each
  opening gets faster as the toolkit hardens.

## 11. Reusable toolkit built on the Ruy/Pirc (use these, don't reinvent)

- **Players:** `LessonPlayer` (beat masterclass + sentence-grained reveal),
  `PlayableLinePlayer` (Watch/Learn/Practice modes + Hint), `MiniBoard`/
  `ConsistentChessboard` (static), `ModelGameViewer`.
- **Services:** `narrationSegments` (sentence reveal), `getRuyTrapPlayableLine`
  (lesson→line converter), `getRuyTrapsForTab` (trap routing),
  `middlegamePlanService` (Dexie plans), `boardAnnotationService`
  (`[BOARD: arrow/highlight]` parsing for the coach).
- **Builder scripts:** `add-leadeye-to-plans.mjs` (generates the lead-the-eye
  arrows+highlights for plan lines), `add-<opening>-middlegame-plans.mjs`,
  `add-<opening>-variation-keyideas.mjs`, `add-<opening>-*-endgame*.mjs`,
  `strip-automined-traps.mjs`. Copy the Pirc set (`add-pirc-*`) as the
  template for a new opening — hand-author prose, replay through chess.js for
  legality + arrows, refuse to write on an illegal move.
