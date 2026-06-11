# PLAN — Chess School / "Winning Chess" Curriculum (2026-06-10)

A new top-level teaching surface: an "accredited-*level*" (not literally
accredited) sequenced chess **class**. David's framing: one COURSE, multiple
**books** the student freely chooses between, **gated once inside** a book (so
they don't get bored), with a **reward** for finishing the whole class (a "50%
off the year"-style diploma reward — billing comes later at go-to-market, so
v1 ships the diploma + a redeemable reward-code artifact wired for future
billing).

> Status: DESIGN/PLAN phase. No app code yet (David: "slow down there cowboy").
> Book-corpus ingestion is the data-first foundation and is greenlit.

---

## Locked decisions (this session)

1. **Rigor model** = mastery-gated progression + per-lesson checkpoint quizzes +
   per-course final exam + completion diploma. Not a fake GPA/transcript.
2. **v1 shape** = ONE course built deep, containing multiple *books* the student
   freely picks between; **gated/sequential once inside a book.**
3. **Course = "Winning Chess"** — the topics David named (piece play, pawn
   structure, weaknesses, how to win) become the *books*.
4. **Reward** = forward-looking. Diploma + redeemable reward code now; maps to a
   real discount once billing exists.
5. **Grounding doctrine (G0/G3, unchanged):** the LLM voices facts, invents zero
   chess. Lesson *ideas/voice* = the book corpus ("guides, NOT verbatim" — David,
   emphatic). Lesson *positions* = `puzzles.json` + the openings DB, never
   invented. Quiz answers = deterministic (the puzzle's real solution; distractors
   chess.js-legal). Every board claim passes `narrationAccuracy`; every narration
   unit carries a resolvable `sources[]`.
6. **Surface name = "The Academy"** (locked, David 2026-06-10). A top-level nav
   tab.
7. **🔒 ZERO-LLM SURFACE — the coach is tied DIRECTLY to the authored book, no
   LLM call (locked, David 2026-06-10).** Verbatim: *"I want the coach to be tied
   directly to the book that we are building so there is no need for an LLM call.
   it just has direct access built in."* The Academy's lecture content is the
   book we hand-author — fully pre-written prose + pre-selected positions + the
   grounding corpus. The coach/voice has DIRECT, built-in access to it and plays
   it back via TTS (`voiceService`); it does **not** call DeepSeek/Anthropic to
   decide or phrase anything. This is the strongest form of G0: there is nothing
   for an LLM to phrase because every word is authored. (Same substrate the
   masterclass `LessonScript` beats already use — authored prose voiced via TTS
   with no per-playback LLM round-trip; the Academy extends it to a full
   curriculum + Q&A answered from the authored book + corpus by direct lookup,
   never generation.) Quiz answers are deterministic (the puzzle's real solution);
   demonstrations are authored lines. **No `getCoachChatResponse` / no provider
   call anywhere on the Academy path.**

---

## Book corpus

### Have (clean Gutenberg text, already tagged into `chess-concepts.json`)
- **Capablanca — Chess Fundamentals** (#33870) — *spine*
- **Edward Lasker — Chess Strategy** (#5614) — *spine; Part VI = middlegame gold*
- Edward Lasker — Chess and Checkers (#4913) — support
- Young — Chess Generalship (#55278) — support (military-metaphor)
- Staunton — Blue Book (#16377), Edge — Morphy Exploits (#34180),
  Bird — History & Reminiscences (#4902) — reference / game-mining / historical

### Adding (US-public-domain, Archive.org OCR — fetch verified working from sandbox)
- **Znosko-Borovsky — The Middle Game in Chess, 1922 1st ed.** — Archive id
  `middlegameinches00znos` (`_djvu.txt`, ~483 KB). **Top priority — literally our
  subject.** 1922 = US-PD (the clean PG-Canada copy is the 1938 3rd ed = NOT
  US-PD until 2034, so we use the 1922 scan).
- **Emanuel Lasker — Common Sense in Chess, 1896** — Archive id
  `commonsenseinche00laskrich` (~136 KB). 12 principle lectures.
- **James Mason — The Principles of Chess in Theory & Practice, 1894** — Archive
  id `principlesofches00masoiala` (~431 KB).
- *(Optional later)* Réti — Modern Ideas in Chess (1923, a modern voice); Mason —
  The Art of Chess (1895); Steinitz — Modern Chess Instructor (1889).

### WHY these weren't already in the corpus (the gap that bit the middlegame plans)
`scripts/fetch-chess-books.mjs` resolves every book through **gutendex (Gutenberg
only)**. Znosko / Common Sense / Mason / Réti / Steinitz are **Archive.org-only**,
so they returned "search-no-match" and were silently skipped — even though the
script's own CANDIDATES list (lines 80-129) explicitly wanted them.
`scripts/list-archive-chess.mjs` is a half-built Archive.org scout that was never
wired into the corpus build. **Net: the middlegame plans were built with ZERO
Znosko grounding** — the one book entirely about the middlegame.

---

## Chapter breakdowns (data-first — extracted from the real TOCs)

**Capablanca — Chess Fundamentals:** I First Principles (mates, pawn endings,
value of pieces, opening strategy, centre, traps) · II Further Endgame Principles
(passed pawn, **the opposition**, B vs N, B+N mate, Q vs R) · III Planning a Win
in the Middlegame (attack with/without knights, indirect attack) · IV General
Theory (**the initiative**, direct attack, threatened attack, cutting pieces off)
· V End-game Strategy (sudden attack from another side, rook endings) · VI Further
Openings & Middlegames (salient points about pawns, backward QBP, the "hole").

**Edward Lasker — Chess Strategy:** III General Principles (balance, **mobility**)
· IV The Opening (development, **pawn play, pawn skeleton, the centre**) · V The
End-game (piece/pawn/mixed endings + 6 annotated master endgames) · **VI The
Middle Game — reads like our course outline:** Objects of Attack · "Backward"
Pawns · On Fixing a Weakness · Weaknesses in a Pawn Position · Breaking up the
King's Side · Doubled Pawns · Manoeuvres of the Pieces · Open Files & Diagonals.

**Znosko-Borovsky — The Middle Game in Chess (1922) — THE middlegame grammar:**
- PART I — The Elements of Chess · General Remarks about the Opening
- **PART II — General Remarks about the Middle Game · Superior Positions ·
  Inferior Positions · Equal Positions** *(this trichotomy = the plan-selection
  framework the middlegame-plans surface should teach)*
- **PART III — Introductory Remarks · Manoeuvres · Attack · Defence · The
  Counter-Battle**

**Emanuel Lasker — Common Sense in Chess:** 12 lectures (opening principles →
attack on the king → defence → endgame). *(Exact lecture TOC to confirm during
the clean-parse ingestion — OCR heading extraction was noisy.)*

**Mason — Principles of Chess:** opens with "Elements of Chess" + synopsis;
positional principles in theory & practice. *(Full TOC to confirm on ingest.)*

---

## The synthesized master plan (the "one book, synced together")

**Znosko's *Middle Game in Chess* (1922) is the teaching ENGINE, not just a
source.** Its structure is a complete method, not a topic list:
- PART I — the three **Elements: Force · Space · Time** (the vocabulary of evaluation)
- PART II — **Valuation** (Superior / Inferior / Equal positions) → **Construction
  & Execution of the Plan**
- PART III — execution: **Manoeuvres · Attack · Defence · The Counter-Battle**

Capablanca and Lasker teach the same ideas scattered across chapters; Znosko
gives the through-line: *learn the elements → value the position by them → build
a plan → execute it.* Units 1–2 + 6 ride Znosko's spine; the topic units supply
structural content; every POSITION comes from `puzzles.json` / the openings DB.

COURSE **Winning Chess — Reading and Winning the Middlegame** (~26 lectures, 7 units):

- **Unit 1 — The Three Elements** *(Znosko I · Capablanca I)*
  1. Force — material's true value (when a pawn beats a piece)
  2. Space — the squares you control
  3. Time — development & the initiative; cost of a wasted move
  4. Threats — force/space/time become concrete threats
- **Unit 2 — Reading a Position** *(Znosko II)*
  5. Valuation — superior, equal, or inferior?
  6. Playing a **superior** position — converting an advantage
  7. Holding an **inferior** position — resistance & counterplay
  8. **Equal** positions — creating the first imbalance
- **Unit 3 — Pawn Structure** *(Capablanca VI · Lasker IV/VI · Mason)*
  9. Isolated queen's pawn — strength & weakness
  10. Doubled & backward pawns — chronic targets
  11. Pawn chains & the freeing break
  12. Passed pawns & majorities — the long-term trump
- **Unit 4 — Weaknesses & Targets** *(Lasker VI objects-of-attack/fixing · Znosko)*
  13. What is a weakness — weak squares & holes
  14. Fixing a weakness before you attack it
  15. Open files & the seventh rank
  16. The principle of two weaknesses — shifting the attack
- **Unit 5 — Piece Play** *(Capablanca II/III · Lasker VI manoeuvres)*
  17. Good vs bad bishop; the bishop pair
  18. Knight outposts & the art of the manoeuvre
  19. Rooks — open files, the 7th, doubling
  20. Bishop vs knight — which, and when
- **Unit 6 — The Attack** *(Znosko III · Capablanca III)*
  21. Attacking the king — when to commit
  22. The classic bishop sacrifice (Greek gift)
  23. Defence & the counter-battle — the counterblow
- **Unit 7 — Endgame Technique** *(Capablanca II/V · Lasker V)*
  24. The opposition & king-and-pawn endings
  25. Rook endings — activity, the 7th, Lucena/Philidor
  26. Converting the won game
- *(+ optional parallel **Tactical Toolkit** book — fork/pin/skewer/mating nets,
  puzzle-led, since the books are thin there.)*

Each unit = a freely-chosen "book"; lectures inside a unit are **gated**. Each
lecture arc = **Lecture → Demonstration → Guided practice → Checkpoint quiz**
(reusing `LessonScript`/`PlayableLinePlayer` + puzzle-backed quizzes). All 7 units
done → final exam → diploma → reward. The course teaches the student to THINK
(Units 1–2) and then applies that method to every position type.

### Per-unit grounding ACROSS ALL BOOKS (the "synced" map)

Every book broken apart and mapped to the units it feeds:

| Unit | Grounded across books (specific chapters) |
|---|---|
| **1 — Three Elements** | Znosko I (Force/Space/Time, threats) · Mason (Elements of Chess, The Forces, Relative Values) · Young (Mobility/Numbers/Time/Position) · Capablanca I.5 (value of pieces) · Lasker-C&C (Relative Value of the Men) |
| **2 — Reading a Position** | Znosko II (Valuation; Superior/Inferior/Equal; plan construction & execution) · Young (Grand Reconnaissance, Organization, Topography) · Lasker-Strategy III (balance of attack & defence, mobility) · Mason (General Principles, Combination) |
| **3 — Pawn Structure** | Capablanca VI (salient points about pawns, backward QBP) · Lasker-Strategy IV (pawn play, pawn skeleton) + VI (doubled pawns, weaknesses in a pawn position) · Mason |
| **4 — Weaknesses & Targets** | **Lasker-Strategy VI (Objects of Attack · On Fixing a Weakness · Breaking up the King's Side)** · Znosko II.III (inferior positions) + III · Capablanca VI ("the hole") + V (sudden attack from a different side = two weaknesses) |
| **5 — Piece Play** | Lasker-Strategy VI (Manoeuvres of the Pieces, Open Files & Diagonals) · Capablanca II.14 (B vs N) + III (attacking with knights) · Lasker-C&C (How the Men Cooperate) · Znosko III.II (Manoeuvres: whole board/centre/wings/pawns) |
| **6 — The Attack** | Znosko III (Attack · Defence · The Counter-Battle) · Capablanca III + IV (initiative, attacks en masse, threatened attack) · **Common Sense (the attack on the king, defence)** · Lasker-Strategy VI (Breaking up the King's Side) · Lasker-C&C (Sacrificing) · Morphy/Edge games (demonstrations) |
| **7 — Endgame Technique** | Capablanca II (opposition, passed pawn, B vs N, B+N mate) + V (rook & pawn endings) · Lasker-Strategy V (+ 6 annotated master endgames) · **Common Sense (R+P "principle of the position")** · Mason (The Opposition, Mate with the Pawn, Relative Values) · Lasker-C&C (Fundamental Endings) |
| **+ Tactical Toolkit** | Mason (Combination) · Common Sense (combinations) · `puzzles.json` themes (fork/pin/skewer/mating nets) |

**Structural payoff:** Units 1–2 are **triple-grounded** — Znosko (Force/Space/
Time), Mason (Forces/Relative Values), Young (military Mobility/Numbers/Time/
Position) all teach the same evaluation triad from three angles. Multi-authority,
not one book's idiosyncrasy.

> Caveat (honesty): Common Sense + Mason per-chapter TITLES aren't cleanly in the
> Archive OCR — their THRUST is verified in-text, exact titles confirm on
> clean-parse during P0 ingestion. Per the "when unsure, don't invent" rule, the
> map cites what's verified.

---

## 🔄 UPDATE (David 2026-06-10, later) — agreed refinements (SUPERSEDE the ordering above)

**🔒 0. PRIORITY — the BOOK is a REFERENCE, not the main focus (David 2026-06-10).**
Verbatim: *"i do not want this to be the main focus of the course but a tool the
user can reference. the main teaching will be lectures and interactive play. hand
written narrations."* So:
- **MAIN teaching = interactive, hand-narrated lectures + play** — the proven
  masterclass `LessonScript`/beats engine pointed at *concepts* (not openings):
  hand-written narration in **two registers** (full Watch + ≤8-word Learn cue),
  lead-the-eye arrows + highlights, **WLPP** interactive play (Watch → Learn →
  Practice → Play), board-verified (`narrationAccuracy`) + sourced, **voiced via
  TTS with no LLM call** (decision 7). The hand-written narration is the real
  authoring work and inherits the locked narration standard (G5/G9/G9.4).
- **The BOOK (the 30 chapters below) is a companion REFERENCE** the user can
  open to *read* a chapter + its diagrams — it plugs into the existing
  `BookReader` surface. It is NOT the centerpiece; the lectures are. The book and
  the lecture share the same authored prose + the same "from your games"
  personalized illustrations (narrated in the lecture, illustrated in the book).
- Build order follows: **lectures + interactive play FIRST**, book as the
  derived companion.



1. **NO single "teaching engine" book.** Znosko is demoted from "the engine" to
   *one source* (it best articulates the Force/Space/Time evaluation language for
   Parts II–III). **Our chapter sequence is the spine**; all seven books are equal
   grounding sources. (David questioned the Znosko-centric framing — correct.)
2. **TACTICS COME FIRST.** Tactics move from an appended "toolkit" to **Part I —
   Tactical Vision**, the foundation. Reason: strategy is unplayable without
   tactical safety, the classics teach tactics first (Capablanca "Simple Mates",
   Lasker "Elementary Combinations"), AND `puzzles.json` (~80k themed/rated) is our
   RICHEST data source — tactics are the best-resourced topic, not the thinnest.
3. **The book = *Winning Chess*, 8 parts / 30 chapters** (each deepened with key
   ideas in the session; author into the content):
   - **I Tactical Vision** — 1 Seeing the Board · 2 The Fork · 3 Pins & Skewers ·
     4 Discovered & Double Attacks · 5 The Mating Patterns *(+ review: your mistakes)*
   - **II The Elements** — 6 Force · 7 Space · 8 Time · 9 Threats
   - **III Reading a Position** — 10 Valuation · 11 Making a Plan · 12 Converting/Holding
   - **IV Pawn Structure** — 13 IQP · 14 Doubled & Backward · 15 Chains & Breaks · 16 Passed Pawns & Majorities
   - **V Weaknesses & Targets** — 17 Weak Squares & Holes · 18 Fixing a Weakness · 19 Open Files & the 7th · 20 Two Weaknesses
   - **VI Piece Play** — 21 Good/Bad Bishop & the Pair · 22 Knight Outposts & Manoeuvres · 23 Rooks · 24 Bishop vs Knight
   - **VII The Attack** — 25 Attacking the King · 26 The Greek Gift · 27 Defence & the Counterblow
   - **VIII Endgame Technique** — 28 Opposition (K+P) · 29 Rook Endings · 30 Converting the Won Game
4. **Per-chapter format = written text WITH illustrations** (David: "it would be
   cool to have written text with illustrations"): **(a)** the idea (original prose,
   grounded, never verbatim) · **(b)** illustrated board diagrams (real FENs from
   `puzzles.json`/openings DB, board-verified) · **(c)** a worked master example ·
   **(d)** "From your games" personalized slot · **(e)** checkpoint quiz (gates the
   next chapter). The Academy ships an actual readable TEXTBOOK alongside the
   interactive lessons.
5. **Illustrations are a CURATED MIX (David):** canonical teaching diagrams are the
   backbone; the student's OWN positions are pulled in **only where they cleanly
   illustrate the chapter** (quality-gated by classification confidence — "empty >
   generic > forced"). A perfect personal example *replaces* the stock diagram; a
   muddy one is skipped.
6. **Personalized illustrations are CREDITED + zero-LLM (David):** the caption shows
   it's the student's own game — **opponent · rating · date · your colour · result ·
   move number** — assembled from `games[sourceGameId]` + the `mistakePuzzle`. The
   write-up (your move, the engine's best, why it's best, why yours fell short) is
   assembled IN CODE from the engine line + classification already stored, wrapped in
   the chapter's authored teaching. **No provider call** (consistent with decision 7,
   the zero-LLM Academy). Callbacks thread mistakes across chapters ("the same weak
   square from Ch. 17"). Data path: `MistakePuzzle{fen,bestMoveSan,classification,
   moveNumber,sourceGameId}` → `GameRecord{white,black,result,date,event,*Elo}`.
7. **Sample built** (proof of concept): Ch. 2 — The Fork, real FENs, every fork
   verified legal + on-target with chess.js, SVG diagrams + credited "from your
   games" slot. The SVG glyph renderer is a PROTOTYPE (piece-centering imperfect);
   **production renders boards via `ConsistentChessboard`** (proper sprites), so
   that's a non-issue at ship.
8. **Next:** draft a STRATEGIC sample chapter (Ch. 17 — Weak Squares & Holes) to
   prove the positional voice + diagrams, mirroring the tactical sample.

---

## 🔄 UPDATE 2 (David 2026-06-11) — full structure + tri-modal + book survey

**A. Structure expanded to ~40 chapters via a gap audit (David: "I want all of it").**
The 30-ch draft (manuscript `docs/academy/winning-chess.md`) is the STARTING point;
these are the must-adds, to be inserted + renumbered in one pass when the skeleton
is locked:
- **Part I (Tactics):** + Removing the Defender (deflection/decoy/overload) · + In-Between Moves (zwischenzug) · + Calculation & Candidate Moves.
- **Part III is rebuilt into the strategic SPINE — 7 chapters:** Reading the Board (the full scan + the imbalances) · Valuation · **Which Side to Attack On** (NEW flagship — the centre decides if a wing attack is allowed; pawns point; space; majority; the king) · **The Art of the Trade** (NEW — good vs bad trades; trade worst-for-best) · Making a Plan · **Prophylaxis** (NEW — read + stop the opponent's plan) · Converting & Holding.
- **Part IV:** + Pawn Centres & the Central Break · (fold Hanging Pawns).
- **Part V:** + The Minority Attack.
- **Part VI:** + Opposite-Coloured Bishops · (The Queen advanced note below).
- **Part VII:** + The King in the Centre · + Opposite-Side Castling & Pawn Storms.
- **Part VIII:** + Pawn Endgame Technique (zugzwang, rule of the square, breakthrough) · + Minor-Piece/Opposite-Bishop Endings · (Basic Mates as a front appendix).

**B. Every chapter is TIERED Foundations → Intermediate → Advanced (David: serve
beginner→advanced, "keep the advanced user's attention").** Content must EXIST at
all tiers; then two routers place the user:
- **Test-out (entry router):** the checkpoint mechanic run at the TOP of a chapter —
  ace it and Foundations collapses, drop into Advanced + hard Practice. Onboarding
  strength-calibration sets the initial global tier.
- **Per-TOPIC adaptive difficulty (drill router):** `getPuzzleForThemeAtRating`
  drives Practice up/down by performance on THAT theme (not blunt global Elo).

**C. Practice = a VARIED, adaptive, mistake-mixed DRILL SET, not a single replay**
(David). Pull many positions by theme + rating band from `puzzles.json` + the
student's own `mistakePuzzles` (SRS-due). This is the Academy-concept Practice
engine; the masterclass-OPENING Practice (same line) stays as-is.

**D. TRI-MODAL — same authored source, three doorways:**
- **Read** — text + diagrams (`BookReader`).
- **Watch** — the interactive WLPP lecture; **Watch = the lecture** (board-dependent).
- **Listen** — a board-free **PHILOSOPHICAL audio track** (David: "concepts you can
  listen to while driving… not what a fork is, but philosophical teachings"). A
  distinct **board-free register** (no square names to visualize, no "look here"),
  TTS-voiced (streaming Polly + the iOS AVAudioSession background-audio patch),
  served as a playlist/podcast. Tactics stay VISUAL; the strategic/philosophical
  chapters feed the audio. Canon for the audio register: **Young** (chess as a
  military campaign), **Nimzowitsch** (restraint/prophylaxis/blockade), **Réti**
  (hypermodern), **Em. Lasker** (the struggle), **Znosko** (Force/Space/Time).

**E. BOOK CORPUS — final survey (US public-domain, 2026 = pub ≤1930 + per-title check):**
- **Have (clean Gutenberg):** Capablanca *Fundamentals* '21 · E. Lasker *Strategy* '15 + *Chess & Checkers* '18 · Young *Generalship* '10 · Staunton · Edge *Morphy* · Bird.
- **Verified PD adds (Archive.org OCR — ingest in P0):** Znosko *Middle Game* 1922 · Em. Lasker *Common Sense* 1896 · Mason *Principles* 1894 (+*Art of Chess* '13) · **Nimzowitsch *My System* 1929 (the ADVANCED-tier bible)** · **Réti *Modern Ideas* 1923** · **Alekhine *My Best Games 1908-1923* 1927** (annotated games) · **Capablanca *My Chess Career* 1920** (annotated games).
- **HOLD (NOT US-PD yet):** Lasker's *Manual of Chess* (English 1932 → 2028) · Réti *Masters of the Chessboard* (English 1932 → 2028) · Nimzowitsch *Chess Praxis* (English 1936) · Tarrasch *The Game of Chess* (1931).
- **Honest thin spot:** there is **no great PD English ENDGAME treatise** pre-1930
  (Berger is German; Fine 1941 not PD). Endgame grounding = Capablanca + Znosko +
  E. Lasker C&C + `puzzles.json` (endgame-tagged).
- The scout (`scripts/list-archive-chess.mjs` → `archive-chess-pd-list.json`, 119
  texts) is a conservative FLOOR — its `NOT_IN_COPYRIGHT` filter MISSES US-PD 1920s
  books Archive hasn't tagged (My System, Alekhine, etc.), so the 1920s advanced
  tier must be verified per-title (done above).
- All books are the IDEAS/voice layer (G3); positions come from the DB. *My System*
  grounds the advanced tier across Parts III–VI (prophylaxis, blockade, the 7th,
  pawn chains, restraint).

**F. The Queen (Part VI) advanced-tier principle (David):** the queen *leads from
behind* — too valuable to spearhead (any minor kicks her, losing tempo); the minors
and pawns crack the position open, then the queen comes in to finish.

**G. The MIDDLEGAME is the app's largest section (David, thinking out loud).** ~30
of ~40 chapters live in the middlegame. It is taught on TWO layers that should
cross-link: the Academy = the **universal** concept layer; the per-opening
`middlegame-plans` = the **applied** layer (the same principle in a real structure).
Concept ⇄ application ⇄ the student's own games. The middlegame likely wants to be a
NAVIGATION HUB, not a buried section.

**H. Pending build (when the skeleton is locked):** (1) restructure the manuscript —
insert the new chapters, renumber, encode the F/I/A tier blocks per chapter, mark
each chapter's board-free audio/Listen text; (2) P0 ingestion now includes My
System / Réti / Alekhine / Capablanca alongside Znosko / Common Sense / Mason →
coach references (all coaches, all tabs — David); (3) derive the WLPP lectures +
the audio playlist surface; (4) wire the from-your-games slots.

---

## Phased build plan

- [ ] **P0 — Book ingestion → coach references.** Extend the fetch path to
  Archive.org (finish what `list-archive-chess.mjs` started); fetch + OCR-clean
  Znosko 1922 / Common Sense / Mason; parse + tag passages into
  `chess-concepts.json` (new `bookSlug`s) and/or `opening-book-pages.json`;
  register the new book ids in `narrationSources.ts` so the coach can cite them;
  update the `bookGrounding.ts` header (it says "7 Gutenberg classics"). Run gates
  (`chessConceptService.test`, `groundedAnswer.test`, narration-grounding) — purely
  additive, must not regress the existing book-teaching path.
- [ ] **P1 — Curriculum data model.** `src/types/academy.ts`
  (`Course`/`Book`/`AcademyLesson`/`ExamQuestion`); new Dexie `academyProgress`
  store (+ version bump & upgrade fn); diploma/reward record.
- [ ] **P2 — Academy surface shell.** Routes (`/academy`, `/:courseId`,
  `/:courseId/:bookId`, `/exam`, `/diploma`), `NAV_ITEMS` entry, hub screens
  (Dashboard pattern), loading/empty/error states, PostHog events, feature flag.
  Wire one stub book end-to-end (progress → exam → diploma → reward).
- [ ] **P3 — Author Book deep (flagship book TBD at build time).** Per the
  lesson arc, grounded + sourced + board-verified.
- [ ] **P4 — Remaining books, final exam, diploma + reward.**
- [ ] **P5 — Gates + audits + ship.** Curriculum-coverage gate, exam-integrity
  gate, soundness; per-surface audit script; 3-instrument post-deploy audit.

---

## TODOs / follow-ups

- [ ] **Back-enrich the EXISTING middlegame-plan narration with the new book
  grounding (`src/data/middlegame-plans.json`).** The middlegame plans were built
  Gutenberg-only and never had Znosko's *The Middle Game in Chess* — the one
  dedicated middlegame primer — nor Common Sense / Mason. After P0 ingestion,
  revisit every middlegame plan's narration + `sources[]` and weave in the Znosko
  PART II/III framework (Superior/Inferior/Equal positions · Manoeuvres · Attack ·
  Defence). This is not just for the new class — it improves the plans already
  shipped. *(David flagged this gap explicitly, 2026-06-10.)*
- [ ] Decide the surface name (Classroom / Chess School / Courses / Lecture Hall).
- [ ] Confirm Common Sense + Mason exact chapter TOCs during clean-parse ingest.
- [ ] Decide which book is the flagship to author first (build-time pick).

---

## Next-session pickup

Start at **P0**. Fetch verified working from the sandbox (curl Archive.org
`_djvu.txt` succeeds; Znosko 1922 already pulled to `/tmp/znosko-1922.txt` in the
originating session). The corpus build scripts to extend:
`fetch-chess-books.mjs` (Gutenberg-only today), `list-archive-chess.mjs` (the
unfinished Archive bridge), `parse-chess-books.mjs`, `mine-book-pages.mjs`,
`clean-book-pages.mjs`. The coach-reference registries to update:
`src/data/narrationSources.ts` (citation allowlist) + the corpus JSONs
(`chess-concepts.json`, `opening-book-pages.json`). Keep ingestion ADDITIVE so the
existing book-teaching path (`bookGrounding.ts` + the `localOpeningBook` cerebellum
tool) never regresses.
