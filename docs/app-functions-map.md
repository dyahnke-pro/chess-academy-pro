# Chess Academy Pro — Complete Function Map

Mapped from source 2026-06-24. Top to bottom, tab by tab. Routes in `src/App.tsx`; nav in `src/components/ui/AppLayout.tsx`.

**Nav tabs (7):** Home · Openings · Coach · Tactics · Weaknesses · Kids Mode · Settings.
Mobile bottom-nav shows the first 5; Kids + Settings live in the slide-out menu.

---

## GLOBAL CHROME (every adult screen)

- **Bottom nav / sidebar** — 7-tab nav with per-tab neon glow; route changes emit a `route-changed` audit and hard-stop any in-flight narration.
- **OfflineBanner** — "You're offline — all training features still work" when `navigator.onLine` is false.
- **Background-analysis banner** — spinner + "Analyzing games — N/M" while Stockfish batch-analyzes imports.
- **QuickFeedbackButton** — slide-in panel: free-text message, attach-screenshot (html2canvas), optional reply email, sends via `navigator.share()` → `mailto:` fallback.
- **InstallPrompt** — PWA install banner; dismissal persisted in `db.meta`.
- **GlobalCoachDrawer** — floating chat drawer (corner popover desktop / right sheet mobile). Streams coach replies with board annotations, TTS, "Practice this position" CTA → `/coach/session/practice`; handles `show_position` handoff → `/coach/play?fen=`. Esc closes. (FAB itself is disabled — opened from SmartSearchBar "Ask Coach".)
- **StrengthCalibrationBubble** — first-run blocking modal: skill-band picker sets `currentRating` + `puzzleRating` + `strengthCalibrated`. Skipped when imported games exist.
- **StarAnimationLayer** — heart flies to the Coach tab when an opening is favorited.
- **BuildVersionWidget** — bottom-right build hash; click to copy; flags when SW has a newer cached build.

---

## 1. HOME — `/` (DashboardPage)

- **Header** — "Chess Academy Pro" + PageHelp ("order of operations", 6 steps; suppressed until calibrated).
- **Import Games button** → `/games/import`.
- **SmartSearchBar** (AI search across the app):
  - Live search over 4 categories: Openings, Games, Mistakes, Puzzles (arrow-key nav, Enter selects).
  - Voice input (mic): interim transcripts → auto-route on intent match, else ask coach via TTS.
  - Intent suggestions at top of dropdown: **Play the [Opening]** → `/coach/session/play-against`; **Study [Opening]** → `/coach/teach`; **Continue Middlegame** → `/coach/session/middlegame`; **Practice [Theme] puzzles** → `/coach/session/puzzle`; **Analyze the position** → `/coach/session/explain-position`; **Add [Opening] to Training Plan** (heart, no nav).
  - **Ask Coach** row (3+ chars) → opens GlobalCoachDrawer seeded with the query.
- **Today's training** strip (renders only if reps exist today, max 5):
  - Built from 3 sources — unified weaknesses (misconceptions), SRS-due openings, unlearned favorite openings.
  - Each rep → its drill route (`/tactics/...`, `/openings/srs`, or `/coach/teach`). Done-today reps show a green check.
  - "See plan" → `/coach/plan`.
- **Section grid (4 tiles):** Openings → `/openings`; Coach → `/coach/home`; Tactics → `/tactics`; Weaknesses → `/weaknesses`.
- **Table of Contents** — collapsible full app-map; every section expands to its capabilities, each navigable.

---

## 2. OPENINGS — `/openings`

### Explorer landing (OpeningExplorerPage)
- PageHelp; **SRS Trainer** entry tile → `/openings/srs`.
- **4 tabs:** Masterclasses (hand-built courses) · Elite/Pro (player repertoires) · Gambits · All (3,641 ECO entries grouped A–E, collapsible).
- **Search** scoped to the active tab.
- **Opening cards** → detail page; heart toggles favorite (favorites bubble to top, fire star animation).

### Detail page — `/openings/:id` (OpeningDetailPage, the masterclass)
- **Header** — name + ECO + color + style; back-to-referrer; PageHelp (7-step); favorite heart; mastery progress ring; "lines discovered / perfected" stats.
- **Variation tabs** — Main line + up to ~7 named variations; each tab re-scopes the WHOLE page ("seven openings in one"). URL-addressable via `?line=`.
- **WLPP unlock ladder (per line):**
  - **Watch** — auto-plays the line with voice narration + lead-the-eye arrows/highlights (LessonPlayer).
  - **Learn** — student plays each move; voice dictates the move, written idea shows below the board; opponent reply voice-gated.
  - **Practice** — same line, silent, Hint button; must be perfect to unlock Play.
  - **Play** — in-page coach match LOCKED to this exact line (OpeningPlayMode), opening phase forced then adaptive Stockfish. Unlocks weapons.
  - Forward-lock with green checks; **"I already know this" expert pass** (1 lifetime per color, two-tap guard) unlocks all.
- **Subline panel** — opponent's level-3 deviations, each with Watch/Play.
- **SRS enrollment** — add/remove this opening's cards to the trainer; "Review" → `/openings/srs`.
- **UNDERSTAND zone (cyan):** zone read-aloud; Overview prose; Key Ideas bullets; **Classic Wisdom** (public-domain master passages, read-aloud); **From the Books** (3-tab Opening/Middlegame/Endgame audiobook reader with follow-along highlight).
- **MASTER zone (blue):** **Checkpoint Quiz** (multi-choice, "play this position" launch); **Middlegame Plans** (per-plan mini-board + WLPP row); **Endgame Plans** (same shape, emerald, self-hides when N/A); **Model Games** (real student-side wins/draws, variation-filtered, open in ModelGameViewer).
- **PITFALLS zone (amber):** named anti-traps (WLPP); "Watch Out For" warnings (read-aloud + Train); warning lines (per-line WLPP); **Common Mistakes** (wrong vs correct move, expandable, WLPP the antidote).
- **WEAPONS section (green, unlocks after Play):** **Punish gems** (common-inaccuracy crushes, mini-board + frequency %/your-score %/engine eval + WLPP); named **weapon traps** (WLPP).

### SRS Trainer — `/openings/srs` (SrsTrainerPage)
- Hub: Card mode (spaced-repetition) vs Line mode (Woodpecker-style); "due today" + "enrolled" stats; your-repertoire list; start review.
- **Card session** — animates into the prompt position; you play the book move; green/red feedback; SM-2 scheduling; end-screen accuracy.
- **Line session** — plays the whole line move-by-move; wrong move reverts & retries; perfected-lines count at end.

### Pro Player — `/openings/pro/:playerId` (ProPlayerPage)
- Player avatar + style + bio + attribution notice; White and Black repertoire card lists; cards → pro-context detail page; heart favorites.

---

## 3. COACH — `/coach` → `/coach/home`

### Hub (CoachPage) — action grid of tiles
Learn with Coach · Play with Coach · The Academy · Game Insights · Endgame · Training Plan · Analyse · Review with Coach.

### Learn with Coach — `/coach/teach` (CoachTeachPage)
The canonical lesson surface (two-column board + chat). Driven by a typed/voiced chat box + an 11-phase walkthrough state machine.
- **Intents the coach understands:** TEACH (walk a line) · DRILL · QUIZ · TRAP · PLAY · FACE (play the opponent's side of a line) · middlegame-plan · move-report (step-by-step "I played e4, your move") · player-game lookup · walkthrough control (new / stop / resume) · opening capture/forget · `/clearcache` · Q&A classes (positional / best-move / principle / traps / meta).
- **Walkthrough runtime:** narration (streamed + voiced), animation, **fork** (board-interactive multiple choice — click or drag), pause/resume, **quiz** forks, leaf → stage menu (drill/quiz/findMove/punish/play-real) → continue.
- **Controls:** voice on/off, New, Stop, Resume, Middlegame Plan, Play Out Plan, **Read Position**, voice mic.
- **Resolution tiers** for a typed opening: static lesson → line-picker → cache → shared → DB-gen, with fuzzy/typo/British-spelling handling and brain Q&A pre-flight.
- **Arrow validator** + auto-pause-on-question wired into response finalization.

### Play with Coach — `/coach/play` (CoachGamePage)
- **Setup:** difficulty (easy/medium/hard, ELO-relative ±300), color, time control, opening subject (URL/voice), middlegame mode (auto-plays the book).
- **Live game:** per-move classification (brilliant→blunder), move-quality flash, eval bar, candidate arrows, **blunder-pause interception** (shows best move + why), out-of-book "plan tracker" alert, phase-transition narration, missed-tactic & hanging-piece alerts.
- **Hints:** 3 tiers (nudge → highlighted candidates → best move) + up to 2 takebacks.
- **Explore-ahead:** branch a side line on the board without affecting the game; coach reacts.
- **Chat panel** (persisted); **Coach Tip** floating bubbles.
- **Post-game review** auto-opens: Summary / Analysis (key moments, missed tactics, bad habits) / move-by-move Walk; actions Play Again / Go to Training / Talk Strategy.
- Active game + chat persisted to Dexie; resumes on return.

### Standalone Chat — `/coach/chat` (CoachChatPage)
Voice I/O, fast-path intent router (zero-LLM for explicit phrases), full LLM path (multi-round tool use), sentence-level streaming TTS, 6 starter chips, `?q=` auto-send, handles `start_play` / `navigate_to_route` / `[VOICE:]` actions.

### Dynamic sessions — `/coach/session/:kind` (CoachSessionPage)
`middlegame` (plan from DB or Stockfish PV) · `play-against` → `/coach/play` · `walkthrough` → `/coach/teach` · `puzzle` → `/tactics` · `explain-position` (static analysis + narration) · `practice` (interactive drill) · `narrate` (play-by-play of a past game). Shared transport: Prev / Play|Pause|Replay / Next / Restart.

### Analyse — `/coach/analyse` (CoachAnalysePage)
FEN paste or board input; Stockfish eval bar + candidate moves; streamed coach explanation (assessment, plans, trade-offs); follow-up Q&A.

### Training Plan — `/coach/plan` (TrainingPlanRolodexPage)
Today's Reps feed (weakness + SRS-due + unlearned, max 5); favorited-openings rolodex (White/Black manila tabs mobile, two columns desktop; drag-reorder, per-color persistence); "See the coach's recommendations" → `/coach/train`.

### Coach Train — `/coach/train` (CoachTrainPage)
Dynamic greeting; auto-generated recommendation cards (lessons / tactic drills / opening reviews / endgame / flashcards) with est. time + route resolution; Quick Actions Play / Analyse / Chat.

### Endgame — `/coach/endgame` (CoachEndgamePage)
8 tabs: **Mating Patterns** (37+ named + piece mates, adaptive Lichess drill, fork phase with drag-to-answer + reveal-after-2-misses), **Principles**, **Pawn Endings**, **Rook Endings** (Lucena/Philidor), **Drawing Patterns**, **Eval Lab**, **Calculation**, **Your Games** (mined mistakes). Shared persistent endgame Elo; per-pattern mastery badges; "Practice More" / "Reshuffle".

### The Academy — `/coach/academy` (CoachAcademyPage)
Two tiles: Opening Courses → `/academy`; The Coaches Library → `/coach/library`.

### Coaches Library — `/coach/library` (CoachesLibraryPage)
5 public-domain master books; shelf grid + full-text search; reader with chapter picker, paragraph-level read-aloud, **living board** (playable line replacing diagrams) with Play/Prev/Next/Reset, follow-along scroll, citation footer.

### Review — `/coach/review` + `/coach/review/:gameId`
- **List:** game picker filtered by source (coach / lichess / chess.com), 100-game cap, sample games auto-seeded, Import + Analyze buttons.
- **Session:** infers player color, runs Stockfish if needed, `?move=N` deep-link, full CoachGameReview (summary / analysis / walk), back to caller.

---

## 4. TACTICS — `/tactics`

### Landing (TacticsPage)
- PageHelp; collapsible **Quick Settings** (Timer / show tactic name / Hints / Voice toggles).
- **From Your Games:** My Mistakes → `/tactics/mistakes`; My Weaknesses → `/tactics/weakness-themes`.
- **Primary:** My Profile → `/tactics/profile`; Daily Training → `/tactics/classic`; Setup Trainer → `/tactics/setup`; Random Mix → `/tactics/drill`.
- **12 theme cards** → `/tactics/drill?theme=` (Forks, Pins & Skewers, Discovered Attacks, Back Rank, Sacrifices, Deflection/Decoy, Zugzwang, Endgame Technique, Mating Nets, …); Opening Traps → `/tactics/opening-traps`.
- **Find the Square** → `/tactics/find-square`.

### Tactical Profile — `/tactics/profile`
"Train Your Weakest" CTA → drill worst theme; top-4 game-derived weaknesses → `/tactics/adaptive`; summary stats (solved / accuracy / themes practiced); 10-theme accuracy breakdown (tap → drill).

### Random Mix Drill — `/tactics/drill`
10-puzzle adaptive ladder; PuzzleBoard with hints/solution/voice; live solved/missed + rating; adaptive rating (+100 clean&fast / +75 clean / +30 assisted / −50 fail); opening-filter chip; summary → Drill Again / View Profile.

### Setup Trainer — `/tactics/setup`
3 depths (Beginner 1-move → Advanced 5+); find the quiet SETUP move then calculate the tactic; ±200 rating band, Elo-formula updates; persists `puzzleRating`.

### Create From Your Games — `/tactics/create`
10 mistake positions; auto-replays the game from N moves back with voice narration; then find the tactic (no type hint); adaptive context depth (grows on streak, resets on miss); `gradeMistakePuzzle`.

### Find the Square — `/tactics/find-square`
Blank-board vision drill; White (a2) / Black (h7) orientation; coordinates toggle + voice mode; Single vs Sequence mode (length grows with streak); current/best streak persisted.

### My Mistakes — `/tactics/mistakes`
Re-analyze games; stats (total/unsolved/solved/mastered); phase tabs (All/Opening/Middlegame/Endgame); smart search (opponent/tactic/opening); filters (classification/source/status); puzzle cards (View-in-Game → `/coach/review`, delete); solve mode (MistakePuzzleBoard "find the better move").

### Adaptive — `/tactics/adaptive`
Easy/Medium/Hard (rating ±200); auto-starts when `forcedWeakThemes` passed; AdaptiveSessionPanel (progress/rating/accuracy/end); +20/+5/−20 rating; 10-puzzle checkpoints; rep-cap mode for dashboard deep-links; spaces misconception SRS tag on ≥60%.

### Classic Trainer — `/tactics/classic`
3 modes — Blitz Rush (30s, no SRS), Rapid (untimed SRS), Training (custom count SRS); SrsGradeButtons (Again/Hard/Good/Easy) adjust interval; daily-challenge complete screen.

### Weakness Themes — `/tactics/weakness-themes`
Detected weak patterns sorted by severity (frequency + avg cp loss); Mixed Weakness Training; per-theme Practice drill; spaces tag on ≥60%.

### Weakness Tag Drill — `/tactics/weakness-drill`
Deep-linked single-misconception drill (from Thinking Errors); MistakePuzzleBoard; `recordTagDrillResult` spacing.

### Lichess Dashboard — `/tactics/lichess`
Needs token (else → Settings); days selector 7–90; total solved / global & recent win rate; weakest themes → "Train Weaknesses" (`/tactics/adaptive`); theme breakdown bars.

### Opening Traps — `/tactics/opening-traps` (OpeningBlundersPage)
Traps mined from opening+tactic corpus, grouped by family, split White/Black; phase filter; rating-distance sort; playable puzzle lesson with **Show the Opening** (reconstructs & animates the line), Hint, Reveal Line (after 2 misses), Next Trap, **Play it Out** vs Stockfish.

---

## 5. WEAKNESSES — `/weaknesses` (GameInsightsPage)

Header: back, total games, Import, Refresh, Analyze, AI search. Summary row: games / win rate / avg ELO / accuracy. **6 tabs:**

- **Overview** — results donut + win-by-color + best-beaten/worst-loss; move-quality stacked bar; per-game averages; accuracy by phase & by color; activity heatmap; by-time-control rows; critical-moments grid. Most cells drill to `/weaknesses/games?f=`.
- **Thinking Errors** — misconception rows ranked by due-today (frequency, last-seen, status, example); tap → `/tactics/weakness-drill`; "Drill in Training Plan" → `/coach/plan`.
- **Openings** — repertoire coverage (in/off book); most-played White/Black; win-rate-by-opening bars; best/worst results; drill accuracy; proficiency matrix heatmap (White/Black/combined). Rows drill to opening games.
- **Mistakes** — error-breakdown donut; errors by phase & by situation (when winning/equal/losing, thrown wins, collapses); costliest mistakes → `/coach/review?move=N`; mistake-puzzle progress.
- **Tactics** — found-vs-missed donut (awareness rate); best sequences & worst misses → review; missed-by-type bars; awareness & by-phase.
- **Patterns** (5+ games) — personal records (highest beaten / fastest win / longest / best accuracy); streaks; phase-strength-over-time heatmap; tactic-recognition heatmap (puzzle vs in-game gap); first-try mastery; color-flip; comeback wins; how-you-win (quick/mid/grind); brilliance shape; stuck-on-mistakes.

### Games drilldown — `/weaknesses/games`
Filtered game list (removable filter chips); EnhancedGameCard (opponent/ELO, result, opening, time control, accuracy, blunder counts, eval sparkline); tap → `/coach/review`.

### Game Database — `/games` (GameDatabasePage)
Import button + inline PGN panel (file upload / paste); filters (ECO text, source dropdown); GameCard list → inline GameViewer.

### Import — `/games/import` (ImportPage)
Platform toggle (Chess.com / Lichess) with saved username; import games + stats (progress, live count, success); player-stats summary (rapid/blitz/bullet/puzzles); Lichess puzzle-activity sync → `/tactics/lichess`.

---

## 6. KIDS MODE — `/kid` (KidLayout wraps all)

Kid chrome: "♞ Kids Mode" header, smart back-button breadcrumbs (hub → `/`), kid theme + Ruth voice locked, no coach drawer / no coach state. **Praise rule:** per-move/per-puzzle voice is banned; voice fires only on milestones, intros/outros, session summaries, and wrong-move nudges. Boards use **KidChessboard** (no eval bar / move list / arrows-on-hover).

### Hub — `/kid` (KidModePage)
Tiles: Pawn's Journey → `/kid/journey`; Fairy Tale Quest → `/kid/fairy-tale`; Puzzle Quest → `/kid/puzzles`; Play a Game → `/kid/play-games`. Six piece-game hubs (Pawn/Knight/Rook/Bishop/Queen/King). Inline **Find the King!** mini-activity (5 positions, click the king). Six **Piece Lessons** → `/kid/:piece`.

### Piece Lessons — `/kid/:piece` (KidPiecePage)
Freeplay demo board, one piece, voiced move-rule; "I got it! ⭐" → hub. No scoring.

### Six piece hubs + games
Each hub: named games + a Puzzles tile + the generic Path/Hunt/Race engines, all currently unlocked, voice toggle, star totals.
- **King** — King Escape (move out of check), King March (e1→e8 through attack zones), Puzzles, Race/Path/Hunt.
- **Queen** — Queen vs Army (capture all pawns before promotion), Queen's Gauntlet (capture but never land on a guarded square), Puzzles, generics.
- **Rook** — Rook Maze (navigate to target, par stars), Row Clearer (capture all pawns, multi-rook), Puzzles, generics.
- **Bishop** — Bishop vs Pawns, Color Wars (two bishops, timed), Two Bishops vs Army, Puzzles, generics.
- **Knight** — Leap Frog (e1→treasure avoiding danger), Knight Sweep (capture all, par), Two Knights vs Army, Puzzles, generics.
- **Pawn** — Pawn Wars (race pawns to back rank vs AI), Blocker (block enemy pawn while promoting), Puzzles, Path/Hunt.
- **Generic engines:** PieceMaze (reach target, obstacles, par stars), PieceSweep (capture all, par), PieceRace (timed, gold/silver thresholds), PairArmy (two heroes vs marching army), PieceLevelSelect (star-grid level picker), KidPiecePuzzles (per-piece adaptive pool, rating ±50, batches of 10, milestone-only praise).

### Pawn's Journey / Fairy Tale Quest — `/kid/journey`, `/kid/fairy-tale`
Chapter map (sequential unlock, completed = stars). Each chapter: Intro story → Lessons (voiced static positions) → Puzzles (AI-generated, adaptive; 3-tier hints; SAN-match then Stockfish-validate; visual-only feedback) → Reward (stars + XP + outro). 25 XP per correct puzzle; resume from last incomplete phase.

### Puzzle Quest — `/kid/puzzles` (KidPuzzlePage)
Difficulty select (easy/medium/hard) → infinite batched puzzle stream (refetch at ≤5 left) → result overlays (visual only) → session-end "Solved N of M" summary. KidPuzzleBoard auto-plays opponent setup move, 2-attempt limit, sound effects.

### Play a Game (Guided Games) — `/kid/play-games` (GuidedGameHubPage / GuidedGamePage)
Famous-game walkthroughs; cards show difficulty/color/est-minutes/milestone-stars. Playthrough: intro → narrated moves (auto-play opponent, interactive on kid's turn, hint arrows after a miss, milestone "you earned a star!" voice) → **Ask the Coach** (kid-safe quick-buttons Why?/What now?/Help! + text, grounded by board FEN) → complete (stars + outro). Dynamic Ruth narration with authored fallback on timeout.

---

## 7. SETTINGS — `/settings` (SettingsPage)

Auto-save (debounced), no Save button. **6 tabs:**

- **Profile** — name, ELO rating, daily-session minutes; Export Data (full Dexie backup JSON); chess.com + Lichess usernames; Import/Analyze buttons; Sync panel (Supabase); Lichess token (encrypted) + dashboard link.
- **Board** — **Master All Off** (kills voice/hints/flash/highlights/legal-moves/animation, restores on toggle-off); highlight last move; show legal moves; show coordinates; piece animation speed; board color (9); piece set (10); **Neon Glow** (master dimmer 0–200%, board/white-piece/black-piece glow colors, live preview, reset); sound effects; eval bar; engine lines; **Piece Sound** synth (pitch/brightness/snap/length + test); move-quality flash; show hints; **All Audio Voice** master gate; move method (drag/click/both).
- **Coach** — **AI Provider & Models** modal (DeepSeek↔Anthropic, per-provider encrypted key, monthly budget cap + estimated spend, commentary/analysis/reports model pickers); **Gameplay Coaching** modal (Coach Narration silent/brief/full, blunder alerts, tactic alerts, positional tips, missed-tactic takeback, ask-why-on-mistakes, coached review, review voice); **Voice & Personality** (coach-voice on/off, personality, Polly-first toggle, Polly voice + preview + endpoint test, live voice-tier indicator, voice speed, system voice + preview).
- **Appearance** — theme picker grid (swatches + active check).
- **Analytics** — data-flow explainer + AnalyticsAuditPanel (coverage map, tier counters, dead-capture warnings, opt-out).
- **About** — version/build/stack; pro attribution; Send Feedback; Check for Updates (hard refresh); Reset All Data (two-stage wipe); Diagnostics (NarrationAuditPanel — audit log, Lichess health probe, voice snapshot, audit-stream toggle, "Copy for Claude"); Bug Report panel.

### Onboarding — `/settings/onboarding` (OnboardingPage)
3 steps: Welcome → API key (provider toggle + key, or Skip) → Profile (name + ELO) → Start Training. Marks `onboarding_skipped`.

---

## ACADEMY (reachable from Coach › The Academy)

- **`/academy` (AcademyPage)** — Opening courses as books in 3 sections (Masterclasses, Counter-Weapons, Gambits) → course syllabus. **The Philosophy of A General** audiobook (chapter transport, read-along prose + CliffsNotes + sources).
- **`/academy/course/:id` (CourseSyllabusPage)** — course cover + progress bar; Resume/Start/Review; **Spar the Tree** → trainer; numbered chapter syllabus with per-chapter WLPP rung row + sublines (opponent deviations with Watch/Play, frequency %).
- **`/academy/course/:id/train` (CourseTrainerPage)** — adaptive tree-sparring: opponent throws lines, student responds; weighted by missed lines; score + skip-line.
- **`/academy/course/:id/lesson`** — the WLPP lesson player (reuses OpeningDetailPage, reads `?line=`).

## MISC / DEEP-LINK ROUTES

- **`/privacy` (PrivacyPolicyPage)** — standalone, no chrome; store-required privacy policy (on-device data, mic, third parties, cloud sync, children, analytics, choices, contact).
- **`/debug/audit` (DebugAuditPage)** — back-door diagnostics (NarrationAuditPanel + `?copy=1`); also `__AUDIT__.copy()` in console.
- **`/neon-mock` (NeonBoardMock)** — neon-glow visual showcase.
- **Redirects:** `/coach` → `/coach/home`; `/puzzles/*` → `/tactics/*`; `/weaknesses/{puzzles,adaptive,classic,mistakes,lichess}` → `/tactics/*`; `/coach/report` → `/weaknesses`; legacy `/kid/mini-games*` → `/kid/pawn-games`, `/kid/king-*` → `/kid/king-games/*`; unknown `*` → `/`.
