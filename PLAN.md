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
- **Phase 4 — The 7-tab shell.** Gold-glow tab bar; selecting a tab
  re-scopes the whole page to that variation (reusing the per-variation
  viewModes). Remove the bottom Variations zone. status: pending.
- **Phase 5 — Per-variation depth.** Author overview/keyIdeas per
  variation; middlegame plans for Breyer/Chigorin/Zaitsev; endgame
  mapping per variation; traps/pitfalls narration quality; source more
  GM games. status: pending.
- **Phase 6 — Full interactive audit pass** (HELD until all above
  deployed, per David). Per G7: off-canonical input, cold-cache,
  pick-before-load, on every touched surface. status: pending.

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

## Next-session pickup

1. Read this file. Confirm main HEAD and which phases have merged PRs.
2. Build phases in order; each ships its own PR (squash to main).
3. Do NOT run post-deploy audits until Phase 6 (David's hold).
4. Reuse the infra listed above; never reinvent the player/runner.
5. Never fabricate GM games or chess moves (G3) — DB + books only.
