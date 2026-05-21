# Opening Masterclass — Variation Tabs + WLPP everywhere

Living plan. Read this first on a new session. Captures David's
approved vision for turning the opening detail page into "seven
openings in one" — each variation a first-class masterclass — and
the phased build to get there.

Owner surface: `src/components/Openings/OpeningDetailPage.tsx` and the
sections it composes. Test bed: **Ruy Lopez** (`ruy-lopez`).

## Current main HEAD reference

Shipped this stream (all on `main`, deploying; **post-deploy audits
are HELD until the whole masterclass lands — David's call**):
- #627: Ruy sublines depth + Marshall/Arkhangelsk orientation→white +
  Ruy variation middlegame plans + secrets-in-env memory.
- #628: stripped garbled OCR board diagrams from "From the Books".
- #629: middlegame & endgame book passages in the Understand zone
  (`ConceptBookSection` + `getConceptBookGroups`).

## The vision (David, 2026-05-21 — APPROVED)

The Ruy page becomes **seven openings in one**. A row of **7 variation
tabs** at the very top; selecting one re-scopes the ENTIRE page to that
variation. **The main opening page IS the template** — every tab
inherits the exact same section format and depth.

**The 7 tabs:** Berlin, Open, Marshall, Exchange, Breyer, Chigorin,
Zaitsev. (No separate Main-Line tab; the Closed main line lives inside
Breyer/Chigorin/Zaitsev.)

**Tab styling:** gold glow. Selected tab = full gold-glow highlight;
unselected tabs = gold glow on the **left + bottom** edges.

**The old bottom "Variations" zone (slate) is REMOVED** — variations
are now top tabs.

### The WLPP grammar (Watch / Learn / Practice / Play)

Every teachable unit speaks the same four verbs. Pattern already exists
on trap/pitfall lines (`handleStartTrapLineAction(i, mode)`,
OpeningDetailPage ~line 1021-1068: Watch=PlayCircle, Learn=LearnIcon,
Practice=Brain, Play=Swords). Reuse it verbatim.

Bring WLPP to **Middlegame** and **Endgame** (neither has it today;
Endgame has no section on the page at all yet):

- **Watch** — auto-play walkthrough (LessonPlayer / walkthrough runner,
  voice-gated, board animation).
- **Learn** — same content, advance-at-your-pace; quote the actual
  Capablanca/Lasker passage for the concept in play (book grounding).
- **Practice** — student plays the key moves (break/maneuver / endgame
  solution) on the board.
- **Play** — Play-with-Coach vs rating-matched engine from the
  critical FEN.

### The GM game = the Watch walkthrough

David: "GM game would be the walkthrough" + "find more games but USE
THE BOOKS!". So:
- Where a real GM game exists (Marshall → Capablanca–Marshall 1918,
  the ONLY model game we have), it IS the middlegame Watch/Learn
  walkthrough, narrated move-by-move to call out the plan's breaks /
  maneuvers / themes, grounded in the book passages.
- Where no GM game exists (the other 6 tabs), the Watch/Learn
  walkthrough = that variation's **DB-sourced masterclass beat-lesson**
  (`RUY_VARIATION_LESSONS`), narration grounded in the **books**.
- **NEVER fabricate GM games or moves (G3).** Source more real games
  over time; until then, books + DB beat-lessons carry it.

### Book reader = tabbed audiobook (Understand zone)

Collapse the two scroll cards (`BookPagesSection` +
`ConceptBookSection`) into **one tabbed reader**: chapters =
**Opening / Middlegame / Endgame**. Audiobook-style: a Play that reads
the chapter aloud passage-by-passage (voiceService), follow-along
highlight, play/pause/skip. Inviting, easy to read, plain English;
one authored plain-English intro line per chapter. (Descriptive
notation in the old passages stays — David: "leave cleaned, focus
authored"; we don't fabricate algebraic conversions.)

### Approved ADD / CHANGE (from the masterclass discussion)

ADD: (1) WLPP on middlegame+endgame; (2) book grounding inside Learn
beats; (3) audiobook reader; (4) GM game as the Watch capstone/spine.
CHANGE: fold the standalone inline `MiddlegameTheorySection` prose into
the **Learn** mode (no separate scroll dump); middlegame plan cards →
plan lines with the 4-button WLPP row; two book cards → one tabbed
audiobook reader.
TAKE AWAY: no LLM-generated middlegame/endgame content (DB is truth).

## Per-variation data inventory (the real work)

Variations in `repertoire.json` carry only `name, pgn, frequency,
deviationMove?, explanation`. NOT overview/keyIdeas/plans/games.

| Ingredient | Status across the 7 tabs |
|---|---|
| Masterclass beat-lesson (Watch/Learn) | exists for all 7 (`RUY_VARIATION_LESSONS`) ✅ |
| Overview + Key Ideas | opening-level only → **author per variation** |
| Middlegame plan (WLPP) | only Marshall/Berlin/Open/Exchange (4/7) → **author Breyer/Chigorin/Zaitsev** |
| GM game (Watch spine) | Marshall only (1) → books+beat-lesson for the rest; source more |
| Endgame mapping | none → **build opening/variation → endgame-lesson map** (27 curated lessons exist) |
| Book audiobook | derivable per variation via concept detection ✅ |
| Traps/Pitfalls | opening-level (6+6) → keep shared v1, curate per variation later |

## Reusable infrastructure (confirmed via research)

- `LessonPlayer` (`src/components/Openings/LessonPlayer.tsx`) — beat
  player, Play, voice-gated auto-advance via `useStrictNarration`,
  board animation. Surfaced via viewModes `learn`/`walkthrough` (main)
  and `variation-learn`/`variation-walkthrough` (variations).
- `walkthroughAdapter.buildSession` / `buildStepsFromPgn` — PGN +
  annotations → `WalkthroughSession`.
- `useWalkthroughRunner` / `walkthroughRunner` — Play/pause/next/prev,
  voice gating.
- Middlegame: `MiddlegamePlanStudy` (tabbed sections), `MiddlegamePractice`
  (interactive), `PlayableLinePlayer` (demo+memory). Plans have
  `playableLines` (FEN+moves+annotations+arrows) — verified legal.
- Endgame: `useEndgamePlayout` + `EndgameLessonTab`; 27 lessons in
  `endgame-principles/pawn-endings/drawn-patterns/rook-endings.json`,
  each with positions (FEN + solution moves + narration).
- Model game: `ModelGameViewer` — Play + animation, critical-moment
  annotations only (no per-move narration → authoring gap).
- Book/concepts: `chessConceptService` — `getOpeningBookPages`,
  `getConceptBookGroups`, `detectConceptsInText`; 664 passages, 56
  concepts; opening passages in `opening-book-pages.json`.
- WLPP button row pattern: OpeningDetailPage trap lines (~1021-1068).
- Gold-glow CSS hooks exist: `opening-action-glow*` classes.

## Phased build (each phase = its own PR, ships independently)

- **Phase 0 — this PLAN.md.** status: in progress.
- **Phase 1 — Audiobook book reader.** Merge `BookPagesSection` +
  `ConceptBookSection` into one tabbed (Opening/Middlegame/Endgame)
  audiobook reader in the Understand zone, with follow-along TTS.
  status: pending.
- **Phase 2 — Middlegame WLPP (template, main page).** Plan lines with
  the 4-button WLPP row (Watch=PlayableLinePlayer auto-play, Learn=
  MiddlegamePlanStudy, Practice=MiddlegamePractice, Play=OpeningPlayMode
  from criticalPositionFen). Inline MiddlegameTheorySection folded into
  Learn + deleted. status: DONE (PR pending). Still TODO in Phase 5:
  swap Watch to a real narrated GM-game walkthrough where one exists.
- **Phase 3 — Endgame masterclass section (template, main page).** New
  EndgameTechniqueSection: opening→endgame-lesson map (openingEndgameMap.ts,
  default fundamentals + ruy override), each lesson a line with Study
  (in-page LessonView, exported from EndgameLessonTab) + Play (vs coach
  from the position). status: DONE (PR pending).
- **Phase 4 — The 7-tab shell.** DONE. VariationTabs (gold-glow:
  selected = full glow, others = left+bottom glow) drives selectedTabIndex
  (-1 = main line). Full-page rescope: subjectName/overview/keyIdeas +
  middlegame plan filter + the main Watch/Learn/Practice/Play buttons all
  retarget the selected variation. Bottom Variations zone removed.
  Generic for all openings (curated 7 for Ruy, all variations otherwise)
  so no opening is stranded. Still shares opening-level keyIdeas/endgame/
  traps per variation until Phase 5 authors per-variation copy.
- **Phase 5 — Per-variation depth.** middlegame plans for Breyer/
  Chigorin/Zaitsev: DONE (all 7 variations now have a plan). Still
  pending: per-variation overview/keyIdeas, per-variation endgame
  mapping, traps/pitfalls narration quality, source more GM games.
- **Phase 6 — Full interactive audit pass** (HELD until all above
  deployed, per David). Per G7: off-canonical input, cold-cache,
  pick-before-load, on every touched surface. status: pending.

## App-wide wiring (David 2026-05-21)

- Variation tabs are URL-addressable via `?line=<label>` (OpeningDetailPage
  reads/writes it; URL is source of truth). DONE.
- Weaknesses: OpeningDrilldown has a "Study this opening" CTA →
  `/openings/<id>` (resolveOpeningIdFromName). DONE.
- Training plan: RolodexRow "Theory & Lines" deep-links to
  `/openings/<id>` (was a filter redirect). DONE.
- Still TODO: coach-chat `drill_opening` could carry a variation; consider
  passing `?line=` from SmartSearch / coach session when a variation is named.

## Decisions log

- 2026-05-21 — 7 tabs = Berlin/Open/Marshall/Exchange/Breyer/Chigorin/
  Zaitsev; no Main-Line tab. (David)
- 2026-05-21 — main opening page is the template; all tabs inherit it.
- 2026-05-21 — remove the bottom Variations zone. (David)
- 2026-05-21 — GM gap: beat-lesson + books now, source real games over
  time; never fabricate. (David: "find more games but USE THE BOOKS!")
- 2026-05-21 — book reader = tabbed audiobook chapters. (David)
- 2026-05-21 — HOLD all post-deploy audits until the masterclass fully
  ships. (David)
- 2026-05-21 — the MAIN LINE (Closed Ruy) is the showcase/template, NOT
  Marshall. The Capablanca–Marshall game is a Marshall-Attack game →
  it belongs under the Marshall tab as that tab's Watch walkthrough,
  not the main-line showcase. (David)

## FEATURE SPEC — "Discussion Practice" tab (David 2026-05-21, all decisions locked)

A guided practice game vs the engine with a two-way, voice-first coaching
conversation, grounded in live tools (masters explorer + Stockfish +
books/DB). The killer feature — nobody else has it.

The loop:
- You play the engine in this tab.
- **You → coach (ask anything about the live position):** "what should I
  play?" / "why a4?" / "what do masters do?" / "is my move bad?" → real-time
  answers from the masters explorer + Stockfish + books.
- **Coach → you (Socratic, on a slip):** "why did you play that?" → you
  answer → logged to Weaknesses as a TAGGED MISCONCEPTION → coach teaches
  with the masters' move + a why.

LOCKED decisions:
1. **Trigger = layered.** Explorer while in book ("you left theory, masters
   play X"), Stockfish once out of book ("that drops a pawn"). Gated to fire
   only when off-book AND the move is actually worse — teach, don't nag.
2. **Coach TAGS the misconception** (e.g. "ignored development tempo",
   "overvalued the f7 attack"). Weaknesses becomes a drillable list of
   recurring thinking errors, NOT a chat transcript. Feeds the Training Plan.
3. **Skippable** — decline to answer → coach drops a one-line teach, plays on.
4. **Voice-first, text optional, BOTH directions.** Speak via the Web Speech
   mic input; coach replies via Polly TTS (verbosity-respecting, G5). Type if
   you prefer.

EXPLAINING THE EXPLORER (hard rule): never show raw percentages. Two numbers
exist — POPULARITY ("played 42% of the time") and SCORE/W-D-L ("White scores
58%", from White's side). Translate to plain English ("the main move",
"roughly equal", "dubious") + always show game count (sample size). Coach
speaks words, never digits.

Already-built rails to reuse: Play-with-Coach (OpeningPlayMode); the
master-play grounding pipeline (masterPlayWatcher + masterPlayContext
injection already feeds the coach what masters play for the live FEN); the
tactical-awareness TacticsLiveContext (feeds Stockfish eval/threats); coach
chat; the Weaknesses system. NEW work: embed the chat in this tab bound to
the live FEN; proactive "why" prompts on a slip; reasoning → tagged-weakness
logging.

Homes for the other tools (David): Training Plan + Game Review (your-games
"you've played this N times, scored X%"); tactics-from-the-opening drills
(puzzles.json punish-stage motifs); woodpecker rapid-fire trainer (blank
board, no narration, resets on error, hint button).

## FEATURE SPEC — Game Review integration (David 2026-05-21)

Game Review becomes a SOURCE of the weakness-tag map (alongside live
Discussion Practice) and a consumer that links back to the masterclass.

- **Auto "where you left the book" marker.** Every reviewed game replays
  its moves against the masters explorer and auto-surfaces the FIRST
  off-book move + what masters play there (plain English, never raw %).
  This is the headline — amateur games are lost by quietly leaving theory
  and nobody shows you where.
- **Off-book × Stockfish gate.** Off-book AND eval-drop = a real error to
  study; off-book but eval-fine = "creative, playable" (no nag). Same gate
  as the live tab.
- **Whole-game coverage, no blind spots.** Explorer marker covers the
  opening/early middlegame (masters DB thins ~move 12-15); past book the
  explorer drops out but **Stockfish + coach carry the discussion through
  the ENTIRE game** — every phase still gets analysed and discussed.
- **Reasoning capture at EVERY blunder, full game.** At each blunder (and
  the book deviation), the coach asks "why did you play this?" (voice or
  text) → tags the misconception → Weaknesses. We lose the explorer past
  book but NEVER stop capturing the user's error reasoning. Skippable per
  blunder. So BOTH live games and reviewed games feed the same tag bucket
  → Training Plan drills. Two faucets, one bucket.
- **Links close the loop.** Review detects the opening → deep-links to its
  masterclass tab (`?line=berlin`); the tab aggregates "you've reached this
  in N games, scored X%, keep missing a4."

Have: Game Review + Stockfish classifications, opening detection, the
explorer pipe, Weaknesses. NEW: the theory-deviation scan (your moves vs
masters), reasoning capture in review, aggregate-on-tab.

## AUDIT STATUS (loop running 2026-05-21)

`audit-openings-interactive-loop.mjs` running vs localhost. Round 7 findings
on ruy-lopez (0 console errors — no crash) are mostly STALE PROBE
EXPECTATIONS, not product bugs: main-line Play navigates to /coach/play by
design (probe expects opening-play-mode on-page); P4 tab-select checks
aria-selected too fast after the URL→effect→state cycle; mount timeouts (8s)
too tight for live drill/play init. The loop must be brought up to the
current product (Play-room nav, tab selection, realistic timeouts) before it
can certify "3 clean rounds." That probe-alignment IS the gate work.

## Next-session pickup

1. Read this file. Confirm main HEAD and which phases have merged PRs.
2. Build phases in order; each ships its own PR (squash to main).
3. Do NOT run post-deploy audits until Phase 6 (David's hold).
4. Reuse the infra listed above; never reinvent the player/runner.
5. Never fabricate GM games or chess moves (G3) — DB + books only.
