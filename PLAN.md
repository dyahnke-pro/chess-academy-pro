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

## FEATURE SPEC — Training Plan = the hub (David 2026-05-21)

The masterclass TEACHES; the Training Plan (`/coach/plan`,
TrainingPlanRolodexPage) DRILLS. It reads the weakness-tag map (from
Discussion Practice + Game Review) + your repertoire and turns them into
prioritized reps. Where the tags finally pay off.

- **Shape:** suggested **"Today's reps"** feed (3-5 prioritized drills) on
  top + the FULL browse menu always available underneath. Both — it
  advises, you drive; never forced into the suggestion.
- **Priority = weighted SHARES, not a strict gate.** Each category gets a
  slice of the daily reps (e.g. of 5: ~3 weakness, ~1 SRS-due, ~1 new).
  Weakness-first → SRS-due → new lines. New lines get the FEWEST slots.
- **Count-against rule (important):** misconception-tagging fires ONLY on
  lines you SHOULD know (learned / SRS-active) or on general principles —
  NEVER on first-exposure theory. A mistake in a line you've never studied
  is "not-learned-yet," not a weakness. New lines stay low-pressure /
  no-penalty in "learning" mode until learned; THEN slips there start
  counting. Keeps the weakness map honest.
- **Drill formats:**
  1. **Weakness drills (headline)** — tag-driven: "Your #1 error,
     overvalued-attack 7×. Five positions where patience wins." Positions
     pulled from opening lines / tactics / your own games tagged to it.
  2. **Opening reps (SRS)** — spaced review of the masterclass lines.
  3. **Woodpecker rapid-fire** — reflex trainer (blank board, fast,
     resets on miss, hint button). (David note 7.)
  4. **Masters "guess the move"** — explorer drill from variation positions.
  5. **Replay your loss** — "left book move 11 in 3 games — drill it."
- **Adaptive loop (makes it a system):** each session feeds tags back →
  re-rank → an error you're fixing graduates out, a new one surfaces.
  Per-tag "mastery" is the exit condition. Plan lives off your data, not a
  fixed checklist.
- **The engine: tag→position mapping** (the real build). Opening tags →
  relevant lines/branches; tactical tags → puzzles.json by theme;
  your-games tags → the positions you flubbed.

## FEATURE SPEC — Per-variation weapons / "watch out for" (David 2026-05-21)

Today `trapLines[]` / `warningLines[]` are opening-level (shared across
tabs). Make them per-variation, hand-curated (no algo).

- **Data model:** a sidecar (like `trap-line-classifications.json`),
  keyed `<openingId>::<trapName>` → `appliesTo: string[]` (variation tab
  labels, e.g. `['berlin']` or `['main']`; omitted = shows on all tabs).
  Keeps curated source JSON untouched.
- **Tab filtering:** Weapons + "Watch out for" sections filter by the
  selected tab (same pattern as the middlegame plan table) — show a trap
  if appliesTo includes the current variation or is general. (e.g. main-
  line Noah's Ark caution stays on main + Closed tabs; Open traps on Open.)
- **Curation = David, not an algo.** Hand-pick which weapon belongs to
  which variation; REMOVE main-line traps from variations they can't occur
  in. Orientation contract holds: trapLines = student weapons, warningLines
  = anti-traps.

## SCALE — 40 openings, Ruy is the template (David 2026-05-21)

The wiring is opening-agnostic and DONE (tabs auto-build from variations,
plans filter via the hand-picked table, per-variation key-ideas/overview
fields, deep-link, sections). So openings #2-40 = AUTHOR THE DATA and it
lights up — the hard part shifts from wiring to curated content.

Repeatable per-opening pass:
1. Curate the first-class variation tabs (like the Ruy 7).
2. Per variation: 4 key ideas + a DB-grounded middlegame plan + traps/
   warnings tagged to it + any genuine endgame.
3. Wiring auto-surfaces it.

David curates the picks; Claude authors the validated content; the builder
scripts (add-ruy-*-plans, keyideas, endgames) enforce legality (G3) and are
the start of a per-opening authoring toolkit that hardens each opening.

## FEATURE SPEC — Onboarding / in-app teaching (David 2026-05-21)

A complex app must teach itself. Per-page guided help, coach-narrated.

- **"i" button top-right on every page** → "click to learn how to use this
  page." Press → step-through coach-marks that SPOTLIGHT each key area
  (dim the rest), each explaining WHAT it does AND WHY it matters (the
  "why" is the point — matches the app ethos).
- **Auto-run on first visit, replayable via "i" after** (track per-page
  "seen" in Dexie). New users taught automatically; veterans opt in.
- **Coach NARRATES the tour (voice).** Ruth + TTS speak you through the
  page — onboarding is voice-first like everything else. e.g. Pro Explorer:
  "Talk to me here — I'll ask why you played a move, log it, map your
  weaknesses."
- **Reusable `PageHelp` component** — one pattern every page mounts,
  opening-agnostic. Scales like the tabs.
- **Teach features WHEN they first matter** — one-time contextual nudges
  (first weakness logged → "tap to see your error map"), not a 12-bubble
  firehose upfront.
- **Empty states as teachers** — empty Weaknesses → "play a game and I'll
  map how you think."
- **Ask-the-coach fallback** — "what is this page?" → spoken explanation.
- **30-sec first-run intro** teaching THE LOOP (learn → play → capture →
  drill → repeat) so users get the mental model before the weeds.
- Skippable / dismissible / never blocks.
- Priority pages: Training Plan, Pro Explorer, the Discussion Practice tab.

## FEATURE — narration piece highlights (David 2026-05-21)

When a walkthrough/lesson beat NAMES pieces or squares ("the f5-knight",
"White's queen-knight", "the b7-bishop"), HIGHLIGHT them on the board
(glow on the square) synced to the narration — lead the eye to what's
being talked about so the user doesn't search the board and lose focus on
the words. This is a teaching essential, not polish.
- Infra to reuse: the [BOARD: arrow:from-to:color] marker system (G6) +
  the board's square-highlight capability. Add a highlight marker
  ([BOARD: highlight:sq:color]) and either author it into beats OR
  auto-parse square refs in the spoken text.
- Best version: highlight each square AS it's spoken (word-timed, magic);
  simpler v1: highlight all squares a beat names while that beat plays.
- Applies to Watch + Learn (LessonPlayer / WalkthroughMode narration).

## TODO — investigate later (2026-05-21)

- **Ruy "Watch" walkthrough-mode not mounting in sandbox — RESOLVED
  2026-05-21: SANDBOX ARTIFACT, prod works.** Headless probes on localhost
  never mount `walkthrough-mode` because WalkthroughMode's narration needs
  the LLM/Polly, which the sandbox blocks (403/cert). David verified on
  prod: the Ruy master class plays perfectly — 19 beats, board + authored
  narration with voice. So the audit's ruy P2/P3 walkthrough findings are
  sandbox-only; NOT a product bug. (Implication: the interactive loop can't
  exercise the voice/walkthrough path headless — treat its walkthrough-mount
  findings as sandbox noise, or stub the LLM for the audit.)
- **Per-variation book reading.** Only 4 Ruy book pages exist, none
  variation-dedicated (general passages mentioning a variation in passing).
  Per-variation "From the Books" needs NEW passage extraction from the
  source public-domain books, keyed per variation. Content task, later.
- **Generic tab labels** keep the opening-name prefix ("Réti: KIA Setup
  g…") → truncate ugly. Strip the prefix on generic (non-curated) tabs.
- **Tab overflow** on narrow viewports — later tabs need horizontal
  scroll/swipe; consider a scroll affordance or shorter labels.

## RUY FINISH — progress (2026-05-21 late)

- ✅ **Audit GREEN** — Ruy-scoped interactive loop: 3 consecutive clean
  rounds (10/11/12, findings=0 errs=0). Gate met. (Walkthrough/voice path
  prod-verified by David, not headless — G7.)
- ✅ **From-the-Books pagination** — one passage/page, gold arrow + "1/4" +
  swipe, auto-turns with narration. Verified page-turn works.
- ✅ **Marshall saving only-moves** — lesson now PLAYS Nd2/a4/Qh5 (DB
  Spassky line) instead of just asserting White holds. 86/86 integrity.
- ⬜ **Traps** — generic auto-mined, no per-variation routing. Hand-curate
  WITH David (real named traps + appliesTo). NEXT.
- ⬜ Fuller per-variation overviews (currently the explanation).
- ⬜ Per-variation book passages (needs extraction; shared for now).

## WEAPONS — verified + ready to build (2026-05-21)

All 5 trap lines confirmed in openings-lichess.json (G3 ✓). Hand-picked
routing (refined: Fishing Pole is a Berlin line per the DB):
- **Noah's Ark** (warning) → MAIN: `e4 e5 Nf3 Nc6 Bb5 a6 Ba4 b5 Bb3 d6 d4
  Nxd4 Nxd4 exd4 Qxd4 c5` → …c4 cages Bb3. Snap-back antidote: don't grab
  with Qxd4 / Bc2 keeps the bishop safe.
- **Mortimer** (warning) → BERLIN: `…Bb5 Nf6 d3 Ne7 Nxe5?? c6` wins the
  piece. Snap-back: don't take e5.
- **Fishing Pole** (warning) → BERLIN: `…Bb5 Nf6 O-O Ng4` — grab it → …h5,
  h-file mate. Snap-back: ignore the knight (don't play h3/hxg4).
- **Tarrasch** (WEAPON) → OPEN: `…Nxe4 d4 b5 Bb3 d5 dxe5 Be6 c3 Be7 Re1
  O-O?? Nd4 Qd7 Nxe6 fxe6 Rxe4` wins material. No snap-back (you punish).
- **Marshall only-move warning** → MARSHALL (authored, not DB): omit g3 /
  grab greedily → …Qh4/…Qh3 mates.

Build = 5 show→snap-back walkthroughs (beat-lesson format + tile→
LessonPlayer wiring) + `appliesTo` sidecar + tab-filter in
OpeningDetailPage + maneuver↔trap narration (Bc2 = Noah's Ark antidote,
already in Breyer/Chigorin endgame plans). Substantial focused build.

## ENDGAME COVERAGE (2026-05-21) — 6 of 7 variations

Done: Exchange (kingside majority), Berlin (queenless), Breyer/Chigorin
(deep line + Bc2↔Noah's-Ark prophylaxis), Zaitsev (tension→technique),
Open (activity into the ending). All DB-grounded deep lines, distinct
narration, routed onto their tabs.
- **Marshall — intentionally NO endgame.** Its deep content IS the
  only-move defense (in mp-ruylopez-marshall); the DB Spassky line stops at
  the defense, no characteristic ending to ground. Fabricating one = G3
  violation. Correct as-is.
- **Main — no distinct endgame.** It's the trunk that branches into
  Breyer/Chigorin/Zaitsev; their endgames ARE the main line's. Main's
  identity = the d4/f4 breaks + traps (Noah's Ark, Fishing Pole).

## RULE — tools wire into ALL play surfaces (David 2026-05-21)

The money tools (explorer-in-play, coach-asks-why, reasoning→tagged-
weakness) must wire into EVERY play surface — the opening Play tab
(OpeningPlayMode), Play-with-Coach, the middlegame/endgame Play buttons,
and Practice — NOT a standalone Discussion tab. Augment the existing play
surfaces; don't silo. (Folded into the Discussion Practice spec.)

## AUDIT STATUS (loop running 2026-05-21)

`audit-openings-interactive-loop.mjs` running vs localhost. ALL ruy-lopez
findings were PROBE ARTIFACTS, not product bugs — verified live:
- **Learn works:** ruy `learn-btn` mounts the authored `lesson-player`
  (getLessonScript returns RUY_LOPEZ_LESSON), not `drill-mode`. Probe now
  accepts either. (Openings without an authored lesson → DrillMode.)
- **Tabs work:** clicking a visible tab (Berlin) rescopes the whole page —
  URL→`?line=berlin`, aria-selected true, overview flips to the Berlin text.
  P4's failure was clicking `variation-tab-0` (Breyer, 7th tab, scrolled
  off-screen in the overflow-x bar) → click timed out. Probe now clicks the
  leftmost (visible) variation tab + scrollIntoView.
- **Play nav:** main-line Play → /coach/play by design; probe accepts it.
- Mount timeouts 8s→15s for live init.
The masterclass is FUNCTIONAL. Loop relaunched with all probe fixes to
certify 3 clean rounds. (Note: 8 tabs overflow the bar on narrow viewports —
later tabs need a horizontal scroll/swipe; not a bug, a possible UX polish.)

## AUDIT STATUS — RUY CERTIFIED (2026-05-21)

`audit-openings-interactive-loop.mjs` scoped to ruy-lopez hit **3
consecutive clean rounds (14, 15, 16: findings=0, errs=0)**. Masterclass
certified. Watch-item (not a blocker): per-round mem-leak-rate is noisy
(15-140 MB/opening) over the long-lived browser page — investigate if it
shows on a fresh-context run. The named-trap lessons + narration-accuracy
gate landed (PR #641): traps play the full multi-source-verified line then
snap back to the antidote; `narrationAccuracy.test.ts` grounds every
square-piece claim and already caught r4/z2 bugs.

## MONEY BUILD — phased (David 2026-05-21: "start building money")

"Two faucets, one bucket" — actually THREE faucets (David: tie game
analysis in without a full review). The shared engine is built first; the
faucets and the hub wire onto it.

- **Phase M0 — the shared engine. status: DONE (this PR).**
  - `src/data/misconceptionTags.ts` — the FIXED closed-set vocabulary
    (16 tags across opening/tactical/positional/endgame/general + an
    `other` catch-all in an `uncategorized` bucket for errors with no
    home, held for later promotion/new tabs). `buildMisconceptionTagMenu`
    renders the closed set into the classifier prompt (LLM picks an id,
    never invents one). Each tag carries a `drill` mapping (kind +
    puzzles.json themes) = the tag→position engine.
  - Dexie v28 store `misconceptionTags` + `MisconceptionTagRecord` type.
  - `src/services/misconceptionService.ts` — `logMisconception` (rejects
    off-vocab tags; requires customLabel for `other`), `getMisconception
    Profile` (ranked by open count; distinct `other` labels stay
    separate), `recordTagDrillResult` (adaptive graduation at
    MASTERY_THRESHOLD=3; a miss resets), `mapTagToDrills`.
  - `src/services/explorerTranslate.ts` — popularity + W/D/L + sample
    size → plain WORDS (never raw %, sample size as words). Single source
    of "masters play X" phrasing for all three faucets.
  - Tests: misconceptionService 9, explorerTranslate 6.
- **Phase M1 — Discussion Practice (live faucet).** Wire into ALL play
  surfaces (OpeningPlayMode first), NOT a silo. Embed coach chat bound to
  live FEN; trigger = off-book (opening DB) AND worse (Stockfish);
  coach asks "why did you play that?" → classify via the tag menu →
  `logMisconception(source:'discussion-practice')`; voice via
  speakStreamed (G5). Count-against gate: only on learned/SRS lines.
- **Phase M2 — Game Review + import auto-analysis (faucets 2 & 3).**
  Where-you-left-book marker (explorer scan over the game, `explorer
  Translate`); reasoning capture at every blunder → `logMisconception
  (source:'game-review')`; deep-link to masterclass tab. Plus passive
  import-time auto-tag from `detectBlunders` + `detectOpening`
  (`source:'auto-analysis'`, no "why" required).
- **Phase M3 — Training Plan hub.** Read `getMisconceptionProfile` →
  "Today's reps" (weighted shares: weakness > SRS-due > new) over the
  full browse menu; drills via `mapTagToDrills`; feed results back via
  `recordTagDrillResult` (graduation loop).
- **Phase M4 — Weaknesses view.** Render the profile incl. the
  Uncategorized bucket; later: promote a frequent `other` label into a
  first-class tag + its own tab.

## Next-session pickup

1. Read this file. Confirm main HEAD and which phases have merged PRs.
2. Build phases in order; each ships its own PR (squash to main).
3. Do NOT run post-deploy audits until Phase 6 (David's hold).
4. Reuse the infra listed above; never reinvent the player/runner.
5. Never fabricate GM games or chess moves (G3) — DB + books only.
