# Coach Middlegame Tab — "The Books, Brought to Life"

**Date:** 2026-06-11
**Status:** DESIGN (decisions locked with David; build not started)
**Branch:** `claude/gallant-hopper-g0yccv` — David: "this goes to a separate
branch for now." Do NOT push to `main`. Override the usual main-only default
for THIS feature until David says it's locked in and ready to promote.
**Sibling target:** an Endgame version of the same tab comes next — David:
"i will want to run the same approach now for end game teachings… we start
with middle then will move to end once its locked in." Build the shell
data-driven so endgame = swap the data, not a rewrite.

---

## The vision (David's words)

> "Under coach we have an endgame tab. Can we make a middle game tab? I want
> it to teach openings by starting at different middle game positions and
> walking the user through key ideas."
>
> "Maybe we use the middle game books that we have downloaded and teach off
> of that? Can we say 'this section is taught from X book authored by X
> person?'"
>
> "I also want to see how it is constructed. Maybe we can match our training
> from what the book does. Just give the book some life so that the player
> can actually play out what it is teaching."

The north star: **a player should be able to read a classic's idea, see the
master's own position, and play out the very technique the book teaches —
and know exactly whose book taught it.**

---

## Decisions locked (design forks David answered)

1. **Browse axis = Both, theme default.** Top-level picker tabs are
   book-grounded THEMES (the book chapters). A "By Opening" tab gives the
   opening-first browse too. Same lesson pool, two lenses.
2. **Attribution = concept-level, self-hiding.** Show "Taught from <Book> by
   <Author>" ONLY where a real passage backs the theme/idea; self-hide where
   there is no genuine source (the empty>generic>invented rule). Wording is
   "taught from" (grounded in the idea), NOT a verbatim-quote claim — our
   passages are elegant translations of the books' ideas, not literal quotes.
3. **Position fidelity = Path B from the start.** Use the book's OWN example
   positions, digitized from the Gutenberg illustrated edition. Not "our
   position attributed to the book" — the master's actual diagram.
4. **Lesson shape = mirror the book's 4-step teaching unit, visibly.** Each
   lesson walks principle → position → play the technique → distill the rule,
   presented so it feels like a book chapter coming to life.

---

## Feasibility — PROVEN end-to-end (2026-06-11)

The whole plan hinged on one risky assumption: can we recover the book's
worked positions and digitize them safely? Proven on a real example before
committing:

- Source text: Project Gutenberg `33870` (Capablanca, *Chess Fundamentals*).
- **The plain-text edition strips every diagram to an `[Illustration]`
  placeholder** — positions are NOT in the text. But the **illustrated HTML
  edition** carries them as images: `…/33870-h/images/Fig1.jpg` … `Fig70+`.
- Pipeline run live on `Fig1.jpg` (Example 1, Rook+King vs King):
  1. `curl` the diagram image from Gutenberg → JPEG, 635×628. ✅ reachable.
  2. Read the board off the image → `7k/8/8/8/8/8/8/R6K w - - 0 1`. ✅
  3. chess.js: position legal; pieces bk@h8, wr@a1, wk@h1. ✅
  4. Book's descriptive first move `R-R7` → algebraic `Ra7`, legal, lands a7
     (the 7th rank — literally the stated principle "drive the king to the
     edge"). ✅
- **Conclusion: Path B is feasible from this environment.** Books are
  public-domain; ~55 worked examples + 14 full games in Chess Fundamentals
  alone, all with diagram images.

### The one hard constraint this surfaced
Move notation is **old English descriptive** (`P-K4`, `Kt-KB3`, `R-R7`),
relative-to-side. It is convertible to algebraic, but **every conversion MUST
be chess.js-validated against the transcribed FEN** — never trust an LLM to
"just convert" (this is exactly the chess-hallucination class the app's
guardrails exist for, G3). Same for the FEN transcription itself: read the
diagram, then cross-check by replaying the book's move sequence — if the moves
are all legal and produce the book's described outcome, the FEN is confirmed.

---

## What our data has vs. what we must build

| Asset | Have it? | Where |
|---|---|---|
| Book PRINCIPLE prose (the idea, in elegant voice) | ✅ | `chess-concepts.json` (25 book-backed concepts), `opening-book-pages.json` |
| Book TITLE + AUTHOR attribution per passage | ✅ | every passage: `bookTitle`, `author`, `bookSlug`, `gutenbergId`, `chapter`, `section` |
| Book → {title,author} registry | ✅ | `getSourceManifest()` (chessConceptService.ts) |
| Source-validation (`book:`/`concept:`/URL) | ✅ | `narrationSources.ts` (`isResolvableSource`, `sourcesAreValid`) |
| The book's example POSITIONS (FENs) | ❌ | must digitize from Gutenberg diagram images (Path B pipeline) |
| The book's technique MOVE SEQUENCES | ❌ (in descriptive notation in source text) | convert → algebraic, chess.js-validated |
| WLPP playout engine | ✅ | `PlayableLinePlayer`, `LessonPlayer`, `useWalkthroughRunner`, `lessonToPlayableLine` |
| Per-opening middlegame plans (529) | ✅ | `middlegame-plans.json` — used for the "By Opening" lens + populating theme examples |

---

## What the books actually teach (the theme universe)

The corpus teaches the **universal middlegame grammar**, not opening theory.
Book-backed themes (the genuine "Taught from X" units):

- **Pawn structure** — isolated pawn (IQP), doubled, passed, backward, pawn
  chain. *(Capablanca, Chess Fundamentals; E. Lasker, Chess Strategy /
  Chess and Checkers)*
- **Positional play** — the initiative, control of the centre, weak squares
  & outposts, open files, king safety, piece development, tempo.
- **Attack & tactics** — the fork, pin, discovered attack, double attack, the
  sacrifice, the Greek gift (Bxh7+), the kingside storm.

NO book backing (modern concepts — self-hide attribution or teach
principle-only, never fake a citation): hanging pawns, pawn majority, minority
attack, fianchetto, outpost, bishop pair, prophylaxis, space advantage,
queenside attack, exchange sacrifice, and the named mates/tactical motifs.

**Endgame themes** (for the sibling tab, already book-backed): opposition,
rook on the seventh, two bishops, bishop vs knight, the Lucena position.

---

## The lesson unit — the book's 4 beats → our WLPP

Capablanca's *Chess Fundamentals* repeats one teaching unit, and it is already
WLPP-shaped. Every lesson mirrors it visibly:

| Book beat | Our rung | Content |
|---|---|---|
| 1. State the principle | **Watch** (intro) | the passage prose, in the book's voice, with the "Taught from <Book> by <Author>" banner. |
| 2. Show the concrete position | **Watch** (demo) | the master's digitized diagram FEN; auto-play the technique with lead-the-eye arrows + highlights. |
| 3. Play the technique | **Learn → Practice → Play** | student executes the book's move sequence (Learn: voice dictates the move, written idea below the board; Practice: silent + hint; Play: locked to the line). |
| 4. Distill the rule | **Watch** (outro) | the one-line takeaway the book leaves you with ("blockade, then besiege"). |

All four beats carry two registers (`say` full + `sayShort` ≤8w) and
`sources[]`, per the narration-coverage + source-verification gates. Voice
rules apply (no SAN in spoken text, name the pattern not the move, etc.).

---

## Architecture

**New route + page (mirrors `/coach/endgame`):**
- `/coach/middlegame` → `CoachMiddlegamePage.tsx` (new). Register in router
  AND add the nav/home tile (standing order: new route → router + nav entry).
- A **Middlegame** tile on `CoachHomePage` next to the Endgame (Crown) tile.

**Picker view** (mirror the Endgame tab's tabbed picker):
- Tab strip across the top: one tab per book-backed THEME + a final
  **"By Opening"** tab.
- Theme tab header: "Taught from <Book> by <Author>" (self-hiding banner).
- Tiles inside a theme = the book's worked examples for that theme (each a
  digitized position), shown with a mini-board + the example's title.
- "By Opening" tab reuses the `middlegame-plans.json` pool keyed by opening.

**Lesson view** (reuse, do not reinvent):
- Drive playout through `PlayableLinePlayer` / `LessonPlayer` +
  `useWalkthroughRunner` (voice-gated, proven). Persistent attribution bar.
- Loading / empty / error states required (standing order for new surfaces).

**Reusable shell for the Endgame sibling:**
- Factor the page as a **data-driven shell**: `{ themes[], lessonsByTheme,
  attributionResolver }`. The Endgame tab = same shell, fed the endgame theme
  config + endgame digitized examples. No second page rewrite.

---

## The Path B content pipeline (per worked example)

Per book example, in order, with the gate at each step:

1. **Locate** the example: passage → `gutenbergId` + chapter/section →
   the matching `Fig<N>.jpg` in the illustrated edition.
2. **Transcribe** the diagram image → FEN (read the board).
3. **Validate FEN** with chess.js (legal position).
4. **Convert** the book's descriptive move sequence → algebraic, applying each
   move to the board; **chess.js must accept every move**. If any move is
   illegal, the FEN or the reading is wrong — STOP, re-read, never invent.
5. **Cross-check**: the move sequence must reach the outcome the book
   describes (mate / won ending / the structural point). This double-confirms
   the transcription.
6. **Stockfish-verify** the technique is sound (the book's line is engine-OK
   at the relevant bar; flag any spot the engine refutes — books occasionally
   have dubious sidelines).
7. **Author** the 4-beat lesson: principle (passage) + position (FEN) +
   technique (validated moves, with lead-the-eye arrows/highlights per move) +
   rule (one-liner). Two registers, `sources[]` = `book:<…>`/`concept:<…>` +
   the Gutenberg URL.
8. **Gate**: the existing narration-accuracy / lessonIntegrity / source-
   verification gates apply; add a new data file's own legality+orientation
   test (mirror `pro-repertoires-orientation`).

When unsure at ANY step: leave blank / skip / ask — never paper over with a
guess (empty > generic > invented).

---

## Scope — OPEN, to discuss with David ("i need to talk to you")

The unit of scope is **themes**, not opening count (the books teach themes
universally; opening breadth comes free under each theme). Remaining decision:

- **Full first cut** = the ~12 book-backed themes, or
- **First wave** to lock the shape, recommended 5 highest-value, iconic-
  example themes:
  1. Isolated pawn (IQP) — Capablanca, "blockade then besiege"
  2. The initiative — Capablanca
  3. Weak squares & outposts — E. Lasker
  4. The kingside storm / Greek gift — E. Lasker
  5. The pawn chain — E. Lasker

Recommendation: **first wave of 5**, prove the pipeline + the "book brought to
life" feel end-to-end on real digitized positions, then go wide theme-by-theme
(and then port the whole shell to Endgame).

---

## Standing-order checklist (when building)

- [ ] New route registered in router + nav/home tile added.
- [ ] New surface has loading / empty / error states.
- [ ] New Dexie store (if any) bumps version + upgrade fn.
- [ ] New data file gets a legality + orientation test; wire into ship-check.
- [ ] Narration two-register + `sources[]` coverage gates green.
- [ ] PostHog events declared if any added.
- [ ] Stays on the feature branch (NOT main) until David promotes it.
- [ ] Audit script for the new surface (clone an existing coach audit) +
      added to the matrix + `docs/AUDIT_INDEX.md`.

## BUILD PROGRESS (2026-06-11)

**Pipeline proven + first lesson shipped to data (not yet UI-wired):**
- `src/data/middlegameBookLessons.ts` — typed data module + the content template.
  First lesson `capablanca-cf-ex13-castled-king` is FULLY DIGITIZED + VALIDATED:
  Capablanca, *Chess Fundamentals*, Fig13 → FEN
  `2q2rk1/1b3ppp/pp6/2p5/2P1N3/PP1Q4/1B3PPP/6K1 w` → the book's forced line
  `Nf6+ gxf6 Qg3+ Kh8 Bxf6#` replays legal and mates (chess.js). Authored as the
  4-beat unit (principle → position → technique → rule), two registers, lead-the-
  eye arrows/highlights, sources.
- `src/data/middlegameBookLessons.test.ts` — the Path-B fidelity GATE: every
  lesson's FEN is legal, the technique replays move-for-move to the claimed
  outcome, arrows originate on real pieces, both registers present, sources
  resolvable. 7/7 green. (Add to ship-check's curated list when wiring lands.)
- `narrationSources.ts` — added `gutenberg.org` to the reputable-domain allowlist
  (the canonical public-domain source for every book lesson). Purely additive.

### Figure → theme sourcing map (verified, ready to transcribe)
Image pipelines CONFIRMED: Capablanca *Chess Fundamentals* (gutenberg 33870,
`FigN.jpg`) and E. Lasker *Chess Strategy* (5614, `diagNN.jpg`). E. Lasker *Chess
and Checkers* (4913) image edition 503'd — retry.

| First-wave theme | Book | Candidate diagrams (verbatim moves already extracted where noted) |
|---|---|---|
| Attack on the castled king (✅ Fig13 done) | Capablanca CF | Fig11, Fig12 (R-R8 back-rank mate — moves extracted), Fig13 ✅, Fig14, Fig15, Fig16 (Greek-gift family — moves extracted) |
| Weak squares / the hole | E. Lasker, Chess Strategy | diag11, diag25 |
| The isolated pawn (IQP) | E. Lasker, Chess Strategy | diag70 (Post–Leonhardt 1907), diag104 |
| The pawn chain | E. Lasker, Chess Strategy | diag29, diag97/98 |
| The backward pawn / open file (alt positional) | E. Lasker, Chess Strategy | diag20, diag86 (backward); diag21, diag127/128 (open file) |

**Transcription discipline (locked, cardinal-sin guard):** never ship a FEN you
can't fully verify. Capablanca's combination diagrams self-validate (replay the
forced mate). Lasker's master-game diagrams are busier (15+ pieces) — transcribe
carefully, then cross-check by replaying the book's continuation; if any move is
illegal, the read is wrong → re-read, never guess. Fig11/12 were NOT shipped this
push because their quiet-pawn placements aren't pinned by the (short) mate line.

### Still TODO (the build, in order)
1. Transcribe + validate the remaining first-wave positions (table above).
2. Author each as a `MiddlegameBookLesson` (4 beats, two registers, arrows).
3. Build `CoachMiddlegamePage` (data-driven shell): theme-tab picker + "By
   Opening" tab + lesson view via the existing WLPP player. Loading/empty/error.
4. Route `/coach/middlegame` + home tile on `CoachHomePage`.
5. Audit script (clone a coach audit) + matrix + AUDIT_INDEX.
6. Wire the gate test into ship-check's curated list.
7. THEN port the whole shell to the Endgame sibling (data swap).

## Next-session pickup

Design is locked except the first-wave-vs-full-themes scope (above). When
David greenlights, START with the Path B pipeline on the 5 first-wave themes
(digitize → validate → author), THEN build `CoachMiddlegamePage` shell + tile
+ route, wiring lessons through the existing WLPP players. Build the shell
data-driven so the Endgame sibling is a data swap.
