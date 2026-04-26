# Chess Academy Pro — UI Surface Audit

**Generated:** 2026-04-26
**Reflects state of `main` at:** `33b5523009e99ea861dc758619aa4a9ab108ffe4`
**Status:** Round 1 of N — routes only. Pages, settings, voice intents in follow-up rounds.

---

## Routes

Source: `src/App.tsx` route declarations + `src/data/appRoutesManifest.ts` (the brain-readable manifest).

### Top level

- **`/`** — Home Dashboard → `src/components/Dashboard/DashboardPage.tsx`

### Openings

- **`/openings`** — Opening Explorer → `src/components/Openings/OpeningExplorerPage.tsx`
- **`/openings/:id`** — Opening Detail (deep-dive on a single opening) → `src/components/Openings/OpeningDetailPage.tsx`
- **`/openings/pro/:playerId`** — Pro Player Repertoire → `src/components/Openings/ProPlayerPage.tsx`
- **`/openings/pro/:playerId/:id`** — Pro Player Opening Detail → `src/components/Openings/OpeningDetailPage.tsx` (same component, scoped by `playerId`)

### Coach

- **`/coach`** — _redirect_ → `/coach/play`
- **`/coach/home`** — Coach Hub → `src/components/Coach/CoachPage.tsx` (note: a separate `CoachHomePage.tsx` file exists but is not directly routed; the hub is rendered by `CoachPage`)
- **`/coach/play`** — Play with the Coach → `src/components/Coach/CoachGamePage.tsx` (the meatiest surface — board, chat panel, hint button, voice toggle, restart, hint tiers, post-game review entry, etc.)
- **`/coach/chat`** — Standalone Coach Chat → `src/components/Coach/CoachChatPage.tsx`
- **`/coach/analyse`** — Analyse a Position → `src/components/Coach/CoachAnalysePage.tsx`
- **`/coach/session/:kind`** — Coach Session Router → `src/components/Coach/CoachSessionPage.tsx` (kinds include `play-against`, `walkthrough`, `explain-position`, `puzzle`, `continue-middlegame`)
- **`/coach/plan`** — Coach Session Plan → `src/components/Coach/CoachSessionPlanPage.tsx`
- **`/coach/train`** — Coach Training → `src/components/Coach/CoachTrainPage.tsx`
- **`/coach/report`** — _redirect_ → `/weaknesses`

### Tactics

- **`/tactics`** — Tactics Hub → `src/components/Tactics/TacticsPage.tsx`
- **`/tactics/profile`** — Tactical Profile → `src/components/Tactics/TacticalProfilePage.tsx`
- **`/tactics/drill`** — Tactic Drill → `src/components/Tactics/TacticDrillPage.tsx`
- **`/tactics/setup`** — Tactic Setup → `src/components/Tactics/TacticSetupPage.tsx`
- **`/tactics/create`** — Create a Tactic → `src/components/Tactics/TacticCreatePage.tsx`
- **`/tactics/mistakes`** — My Mistakes → `src/components/Puzzles/MyMistakesPage.tsx`
- **`/tactics/adaptive`** — Adaptive Puzzles → `src/components/Puzzles/AdaptivePuzzlePage.tsx`
- **`/tactics/classic`** — Classic Puzzle Trainer → `src/components/Puzzles/PuzzleTrainerPage.tsx`
- **`/tactics/weakness`** — Weakness Puzzles → `src/components/Puzzles/WeaknessPuzzlePage.tsx`
- **`/tactics/weakness-themes`** — Weakness Themes → `src/components/Puzzles/WeaknessThemesPage.tsx`
- **`/tactics/lichess`** — Lichess Puzzle Dashboard → `src/components/Puzzles/LichessDashboardPage.tsx`

### Tactics — legacy `/puzzles/*` redirects

- **`/puzzles`** → _redirect_ `/tactics`
- **`/puzzles/classic`** → _redirect_ `/tactics/classic`
- **`/puzzles/adaptive`** → _redirect_ `/tactics/adaptive`
- **`/puzzles/mistakes`** → _redirect_ `/tactics/mistakes`
- **`/puzzles/weakness`** → _redirect_ `/tactics/weakness`
- **`/puzzles/lichess-dashboard`** → _redirect_ `/tactics/lichess`

### Weaknesses (game insights)

- **`/weaknesses`** — Game Insights → `src/components/Insights/GameInsightsPage.tsx`

### Weaknesses — legacy redirects

- **`/weaknesses/puzzles`** → _redirect_ `/tactics/weakness`
- **`/weaknesses/adaptive`** → _redirect_ `/tactics/adaptive`
- **`/weaknesses/classic`** → _redirect_ `/tactics/classic`
- **`/weaknesses/mistakes`** → _redirect_ `/tactics/mistakes`
- **`/weaknesses/lichess-dashboard`** → _redirect_ `/tactics/lichess`

### Games library

- **`/games`** — Game Database → `src/components/Games/GameDatabasePage.tsx`
- **`/games/import`** — Import Games → `src/components/Games/ImportPage.tsx`

### Settings

- **`/settings`** — Settings → `src/components/Settings/SettingsPage.tsx` (tabbed: Profile / Board / Coach / Appearance / About)
- **`/settings/onboarding`** — First-run Onboarding → `src/components/Settings/OnboardingPage.tsx`

### Hidden / dev

- **`/debug/audit`** — Audit Log Viewer (deep-link only) → `src/components/Debug/DebugAuditPage.tsx` (supports `?copy=1` query param to auto-copy on load)
- **`/neon-mock`** — Neon Board Mock (visual styling test surface) → `src/components/Board/NeonBoardMock.tsx`

### Catch-all

- **`*`** → _redirect_ `/` (any unknown URL falls back to home)

### Kid mode (separate layout — `<KidLayout>`)

- **`/kid`** — Kid Mode Hub → `src/components/Kid/KidModePage.tsx`
- **`/kid/journey`** — Pawn's Journey Map → `src/components/Kid/JourneyMapPage.tsx`
- **`/kid/journey/:chapterId`** — Journey Chapter (per-piece, e.g. `pawn`, `king`, `knight`) → `src/components/Kid/JourneyChapterPage.tsx` (thin wrapper around `GameChapterPage`)
- **`/kid/queen-games`** — Queen Games Hub → `src/components/Kid/QueenGamesHub.tsx`
- **`/kid/fairy-tale`** — Fairy Tale Map → `src/components/Kid/FairyTaleMapPage.tsx`
- **`/kid/fairy-tale/:chapterId`** — Fairy Tale Chapter → `src/components/Kid/FairyTaleChapterPage.tsx`
- **`/kid/rook-games`** — Rook Games Hub → `src/components/Kid/RookGamesPage.tsx`
- **`/kid/rook-maze/:level`** — Rook Maze (level 1, 2, 3) → `src/components/Kid/RookMazePage.tsx`
- **`/kid/row-clearer/:level`** — Row Clearer (level 1, 2, 3) → `src/components/Kid/RowClearerPage.tsx`
- **`/kid/mini-games`** — Mini-Games Hub → `src/components/Kid/MiniGameHubPage.tsx`
- **`/kid/mini-games/pawn-wars/:level`** — Pawn Wars (level 1, 2, 3) → `src/components/Kid/MiniGamePage.tsx` (`gameId="pawn-wars"`)
- **`/kid/mini-games/blocker/:level`** — Blocker (level 1, 2, 3) → `src/components/Kid/MiniGamePage.tsx` (`gameId="blocker"`)
- **`/kid/king-escape`** — King Escape → `src/components/Kid/KingEscapeGame.tsx`
- **`/kid/king-march`** — King March → `src/components/Kid/KingMarchGame.tsx`
- **`/kid/knight-games`** — Knight Games Hub → `src/components/Kid/KnightGamesPage.tsx`
- **`/kid/knight-games/leap-frog`** — Leap Frog → `src/components/Kid/LeapFrogGame.tsx`
- **`/kid/knight-games/knight-sweep`** — Knight Sweep → `src/components/Kid/KnightSweepGame.tsx`
- **`/kid/play-games`** — Guided Game Hub → `src/components/Kid/GuidedGameHubPage.tsx`
- **`/kid/play-games/:gameId`** — Guided Game → `src/components/Kid/GuidedGamePage.tsx`
- **`/kid/puzzles`** — Kid Puzzles → `src/components/Kid/KidPuzzlePage.tsx`
- **`/kid/:piece`** — Kid Piece Lesson (catch-all for piece-intro pages: `king`, `queen`, `rook`, `bishop`, `knight`, `pawn`) → `src/components/Kid/KidPiecePage.tsx`

---

## Page components without a routed entry

These page components exist on disk but are not declared in `src/App.tsx`. They may be rendered as embedded panels, reachable via internal links, or unused/legacy:

- `src/components/Stats/StatsPage.tsx` — Stats / progress dashboard (no route; possibly invoked from Settings or a deprecated link)
- `src/components/Analysis/AnalysisBoardPage.tsx` — Standalone analysis board (no route)
- `src/components/Flashcards/FlashcardStudyPage.tsx` — Flashcard study surface (no route)
- `src/components/Play/GamesPage.tsx` — Play / challenges hub (no route; the `/play` path is not declared)
- `src/components/Puzzles/PuzzlesHubPage.tsx` — Standalone puzzle hub (no route; the live tactics hub is `/tactics` via `TacticsPage`)
- `src/components/Coach/CoachHomePage.tsx` — Alternate coach hub layout (no route; `/coach/home` resolves to `CoachPage`)
- `src/components/BoardTest/BoardTestPage.tsx` — Board test sandbox (no route)
- `src/components/Kid/GameMapPage.tsx` — Shared Kid map renderer (rendered as backing component for Journey/FairyTale maps; not routed directly)
- `src/components/Kid/GameChapterPage.tsx` — Shared Kid chapter renderer (backing for `JourneyChapterPage` / `FairyTaleChapterPage`)

---

## Route count summary

- **Live routes (non-redirect):** 50
  - Top-level: 1
  - Openings: 4
  - Coach: 7 (plus `/coach` itself which redirects)
  - Tactics: 11
  - Weaknesses: 1
  - Games library: 2
  - Settings: 2
  - Hidden/dev: 2
  - Kid mode: 21
- **Redirect routes:** 13 (legacy `/puzzles/*`, `/weaknesses/*` redirects, `/coach`, `/coach/report`, catch-all)
- **Page components without a routed entry:** 9

_Next round: per-page interactive controls (Home, Coach play, Coach chat, Settings tabs, etc.) — append below._

---

## Round 2 — Highest-priority surfaces

Generated 2026-04-26 against `main` at the round-2 commit. Each control listed individually.

---

### Section 1 — Coach play page (`/coach/play`)

Component: `src/components/Coach/CoachGamePage.tsx`. The single most control-dense surface in the app.

**Top header (left → right):**
- **Back-to-coach-hub** — Returns to `/coach` from the play page | trigger: button | file: `CoachGamePage.tsx:2559` (also empty-state at `:2367`)
- **Play-as-White** — Choose to play the white side at game start | trigger: toggle button | testid `color-white-btn` | file: `:2574-2583`
- **Play-as-Black** — Choose to play the black side at game start | trigger: toggle button | testid `color-black-btn` | file: `:2585-2594`
- **Coach-tips toggle** — Master on/off for in-game coach tip bubbles + missed-tactic alerts | trigger: button toggle | aria-label switches between `Disable coach tips` / `Enable coach tips` | testid `coach-tips-toggle` | file: `:2612-2628`

**Game board (centre):**
- **Drag-drop a piece** — Standard mouse/touch drag from source to destination | trigger: pointer drag | (board rendered by `<ChessBoard>` around `:2890-2920`)
- **Click-move (tap source then destination)** — Alternative move input mode (controlled by Settings → Board → Move Method) | trigger: tap/click
- **Pawn promotion picker** — Auto-shown overlay when a pawn reaches the back rank; choose Queen / Rook / Bishop / Knight | trigger: button selection | (auto-promotion to queen if Settings → Board → Auto-Promote is on)
- **Coach hint arrow / ghost-piece overlay** — Visual hint rendered on the board after the user taps Hint | trigger: auto-display
- **Coach last-move highlight** — Yellow square highlight on the coach's last move | trigger: auto-display
- **Eval bar (left or right strip)** — Stockfish evaluation visualisation; hideable from Settings → Board → Eval Bar | display only

**Coach-tip bubble (above the board, surfaces during play):**
- **Show-prev show-step** — Step backwards through a "show me the line" tactic walkthrough | trigger: button | testid `show-prev-btn` | file: `:2754`
- **Show-next show-step** — Step forwards through the same | trigger: button | testid `show-next-btn` | file: `:2766`
- **Show-tactic-line** — Coach plays out a tactical line on the board for review | trigger: button | testid `show-tactic-line-btn` | file: `:2828`
- **Explore-from-here** — Enter explore-mode from the current bubble's position so the student can try variations | trigger: button | testid `explore-from-here-btn` | file: `:2845`
- **Dismiss-tip** — Close the coach tip bubble | trigger: button | testid `dismiss-tip-btn` | file: `:2861`

**Blunder interception (when student blunders):**
- **Blunder-continue** — Acknowledge the blunder and keep playing | trigger: button | testid `blunder-continue` | file: `:2940`
- **Blunder-takeback** — Undo the blunder move | trigger: button | testid `blunder-takeback` | file: `:2948`
- **Blunder-try-best-move** — Undo the blunder AND apply the engine's best move instead | trigger: button | testid `blunder-try-best` | file: `:2956`

**Banners (status bars when board state is displaced from live game):**
- **Back-to-game** — Return to the live game from a temporarily-loaded position | trigger: button | testid `back-to-game-btn` | file: `:2666` (temp position banner) and re-used at `:2691` for practice-position banner

**Action row under the board (left → right, line range `~2997-3094`):**
- **Take-back** — Undo last move pair (student's move + coach's response) | trigger: button | testid `takeback-btn` | file: `:2997-3007`
- **Restart-game** — Reset the board to the starting position | trigger: button | aria-label `Restart game` | testid `restart-btn` | file: `:3009-3018`
- **Read-this-position-aloud** — Coach speaks an analysis of the current position via Polly TTS | trigger: button | aria-label switches between `Restart position narration` / `Read this position aloud` | testid `read-position-btn` | file: `:3027-3035`
- **Skip-to-review** — Jump straight from mid-game to post-game review (debug aid) | trigger: button | testid `skip-to-review-btn` | file: `:2488`
- **Hint-button (3-tier system)** — Tier 1 reveals the WHY, Tier 2 names the piece, Tier 3 shows move + arrow + rationale; rendered by `<HintButton>` from `src/components/Coach/HintButton.tsx` | trigger: button | testid `hint-button` | parameters: tier `0|1|2|3` per the `HintLevel` type

**Move-navigation row (after game ends or while reviewing):**
- **Nav-first** — Jump to the starting position | trigger: button | aria-label `First move` | testid `nav-first` | file: `:3062-3068`
- **Nav-prev** — Step backwards one half-move | trigger: button | aria-label `Previous move` | testid `nav-prev` | file: `:3071-3077`
- **Nav-next** — Step forwards one half-move | trigger: button | aria-label `Next move` | testid `nav-next` | file: `:3080-3086`
- **Nav-last** — Jump to the final move played | trigger: button | aria-label `Last move` | testid `nav-last` | file: `:3089-3095`

**Mobile chat drawer:**
- **Mobile-chat-toggle** — Open the chat drawer on mobile (hidden on desktop where the panel is always visible) | trigger: button | aria-label `Open chat` | testid `mobile-chat-toggle` | file: `:3107-3119`
- **Drawer overlay tap** — Tap-outside dismissal of the mobile chat drawer | trigger: tap

**Game chat panel (rendered by `<GameChatPanel>` at `:3122` for mobile and `:3180` for desktop, component file `src/components/Coach/GameChatPanel.tsx`):**
- **Chat-input text field** — Type a question / command to the coach | trigger: text input | placeholder example: "Ask about the position..."
- **Voice-mic button** — Web Speech / Polly mic input that auto-fills the chat input as the user speaks | trigger: button toggle (start/stop)
- **Send-message button** — Submits the typed/dictated message to `coachService.ask` | trigger: button (also `Enter` keyboard shortcut)
- **Chat-message bubble** — Rendered chat messages from user + coach; coach messages may auto-narrate via Polly | display only (TTS triggered automatically)
- **In-game intercepts (deterministic regex paths fired BEFORE the brain — see Section "Existing voice command intents" in a later round):** narration-toggle ack ("voice off / on"), restart-game ack ("restart" / "fresh game"), play-opening ack ("play the X opening"), what-if branch (`onPlayVariation`), return-to-real-game (`onReturnToGame`), forget-intent ("forget that").

**Drawer / split-view divider (desktop only):**
- **Panel-divider drag handle** — Resize the chat-panel-vs-move-list split on desktop | trigger: pointer drag | testid `panel-divider` | file: `:3171`

**Phase narration card (auto-shown at opening→middlegame, middlegame→endgame transitions):**
- **Phase-narration text card** — Displays + speaks a transition narration; controlled by Settings → Coach → Phase Narration Verbosity | display only (no manual control on this surface)

**Post-game (after gameState transitions to `postgame`):**
- The play-page hands off to `<CoachGameReview>` (`src/components/Coach/CoachGameReview.tsx`) — covered in a later round.

---

### Section 2 — Home / Dashboard (`/`)

Component: `src/components/Dashboard/DashboardPage.tsx`. Single control-light surface; the heavy lifting is in the embedded `SmartSearchBar`.

- **Page title "Chess Academy Pro"** — Static heading | display only | file: `DashboardPage.tsx:83-85`
- **Import Games button** — Navigates to `/games/import` | trigger: button | testid `import-games-btn` | file: `:89-103`
- **Smart Search bar** — Embedded global `<SmartSearchBar>` component without a scope filter (returns mixed games / openings / mistakes / puzzles + agent-action suggestions) | trigger: text input + voice mic + suggestion dropdown | file: `:108`
  - Sub-controls: search input, clear-X, voice mic, suggestion dropdown (keyboard nav with ↑/↓/Enter/Escape), AI badge caption, "Ask Coach" suggestion, "Start session" agent-action suggestions (kinds: `play-against`, `walkthrough`, `puzzle`, `explain-position`, `continue-middlegame`).
- **Section card: Openings** — Big tap-target card; navigates to `/openings` | trigger: button | testid `section-openings` | file: `:113-145` (one of 4 entries in the `SECTIONS` array at `:20-53`)
- **Section card: Play with Coach** — Navigates to `/coach/play` | trigger: button | testid `section-play-with-coach` | file: same render block, route `/coach/play`
- **Section card: Tactics** — Navigates to `/tactics` | trigger: button | testid `section-tactics`
- **Section card: Weaknesses** — Navigates to `/weaknesses` | trigger: button | testid `section-weaknesses`

That's the entire Dashboard surface — 1 title, 1 import button, 1 search bar (with ~5 sub-controls), 4 section cards.

---

### Section 3 — Openings explorer (`/openings`) and Opening detail (`/openings/:id`)

#### 3a. Opening Explorer (`/openings`)

Component: `src/components/Openings/OpeningExplorerPage.tsx`.

**Tab toggle (line `:131-156`, four equal-width tabs):**
- **Tab "Most Common"** — Surfaces the curated common-openings list | trigger: button | testid `tab-repertoire` | id `common`
- **Tab "Pro"** — Switches to pro-player repertoires (renders `<ProRepertoiresTab>`) | trigger: button | testid `tab-pro` | id `pro`
- **Tab "Gambits"** — Filters to gambit-style openings | trigger: button | testid `tab-gambits` | id `gambits`
- **Tab "All"** — Full ECO-grouped index (only this tab shows the ECO collapsible groups below) | trigger: button | testid `tab-all` | id `all`

**Search bar (line `:160-165`):**
- **Smart Search bar (scoped)** — `<SmartSearchBar scope="opening">` — same component as Dashboard but filtered to openings only | trigger: text + voice + dropdown

**Opening cards (rendered per tab; multiple sections in source map to multiple click targets):**
- **Opening card click** — Navigates to `/openings/:id` for the chosen opening | trigger: button | files: `:187`, `:213`, `:239`, `:278`, `:317` (different sections render slightly different card variants for Common / Pro / Gambits / All / search-results)

**ECO grouping (only on tab `all`):**
- **ECO-letter expand/collapse** — Toggle expand of an ECO-class group (A, B, C, D, E) | trigger: button | testid `eco-toggle-{letter}` | file: `:294-301`
- **Group container** — labelled with `eco-group-{letter}` data-testid | display only (carousel-style listing)

**Search results dropdown (when search bar has results):**
- **Result row click** — Tap a search result to open that opening's detail page | trigger: button (handled inside `SmartSearchBar`)

#### 3b. Opening Detail (`/openings/:id`, also reachable as `/openings/pro/:playerId/:id`)

Component: `src/components/Openings/OpeningDetailPage.tsx`.

**Header (line `:558-590`):**
- **Back button** — Returns to `/openings` (or `/openings/pro/:playerId` when in a pro context) | trigger: button | aria-label `Back to openings` | testid `back-button` | file: `:561-567`
- **Favorite toggle** — Star/unstar this opening | trigger: button | aria-label switches between `Add to favorites` / `Remove from favorites` | testid `favorite-btn` | file: `:583-590`

**Progress chips (display only, line `:599-601`):**
- **Lines discovered** — `N/M lines discovered` chip | testid `lines-discovered`
- **Lines perfected** — `N/M lines perfected` chip | testid `lines-perfected`

**View-mode tabs (line `:606-636`, four buttons):**
- **Walkthrough mode** — Coach plays through the opening with narration | trigger: button | testid `walkthrough-btn` | file: `:607-613`
- **Learn mode** — Step-by-step study mode | trigger: button | testid `learn-btn` | file: `:615-621`
- **Practice mode** — Drill the moves; engine challenges the user | trigger: button | testid `practice-btn` | file: `:623-629`
- **Play mode** — Play a full game starting from this opening's main line | trigger: button | testid `play-btn` | file: `:631-637`

**Narration toggle (per section, dynamic — line `:534-548`):**
- **Narrate-{sectionId}** — Speak/stop a section's prose aloud (used on multiple sections of the page: overview, idea, plans, etc.) | trigger: button | aria-label varies (`Narrate <section>` / `Stop narration`) | testid pattern `narrate-{sectionId}`

**Trap lines section (line `:720-808`):**
- **Train traps** — Master entry-point that opens the traps drill | trigger: button | aria-label `Train traps` | testid `train-traps-btn` | file: `:722-728`
- **Trap line card click** — Opens that specific trap's walkthrough | trigger: button | aria-label `Open <name>` | per-line testid `trap-line-{i}` | file: `:746-756`
- For each trap line, a four-button row with view modes:
  - **Trap watch (walkthrough)** — testid `trap-walkthrough-{i}` | file: `:758-765`
  - **Trap learn** — testid `trap-learn-{i}` | file: `:767-774`
  - **Trap practice** — testid `trap-practice-{i}` | file: `:776-783`
  - **Trap play** — testid `trap-play-{i}` | file: `:785-792`

**Warning lines section (line `:813-893`, mirrors traps):**
- **Train warnings** — Master entry-point | trigger: button | aria-label `Train warnings` | testid `train-warnings-btn` | file: `:815-821`
- **Warning line card click** — Opens that specific warning's walkthrough | testid `warning-line-{i}` | file: `:839-849`
- Per-warning four-button row:
  - **Warning watch** — testid `warning-walkthrough-{i}`
  - **Warning learn** — testid `warning-learn-{i}`
  - **Warning practice** — testid `warning-practice-{i}`
  - **Warning play** — testid `warning-play-{i}`

**Variations section (line `:903-:end`):**
- **Variation card click** — Opens a variation's walkthrough | trigger: button | aria-label `Open <name>` | testid pattern `variation-{i}` | file: `:907-919`
- Likely additional per-variation action buttons (walkthrough/learn/practice/play) at `:949+` matching the trap/warning shape — same pattern.

**Position browser / move list (rendered by sub-components — not directly enumerated here):**
- The board + move history under each view-mode is delegated to walkthrough / practice / lesson components (covered in a future round if needed).

---

_Round 2 ends. Rounds 3+ to cover Tactics surface (`/tactics/*`), Weaknesses (`/weaknesses`), Coach sub-surfaces (chat, analyse, session, plan, train), Settings tabs (Profile, Board, Coach, Appearance, About), Onboarding, Stats, Kid mode, hidden/dev surfaces, voice command intents, and cross-surface gestures._

---

## Round 3a — Tactics surface (`/tactics/*`)

Surface-level inventory of the hub plus the four highest-traffic drill pages. Detail flagged where a control has non-obvious parameter values; otherwise just the trigger.

### `/tactics` — Tactics Hub

Component: `src/components/Tactics/TacticsPage.tsx` (testid `tactics-page`).

Three rows of cards.

**Row 1 — fixed actions (`FIXED_BUTTONS` array, 4 entries):**
- **My Profile** (col-span-2, big card) — Navigate to `/tactics/profile` | testid `section-spot` | file: `:108-115`
- **Daily Training** — Navigate to `/tactics/classic` (PuzzleTrainerPage) | testid `section-daily`
- **Setup Trainer** — Navigate to `/tactics/setup` (TacticSetupPage) | testid `section-setup`
- **Random Mix** (col-span-2) — Navigate to `/tactics/drill` with state `{ filterThemes: ['fork','pin','skewer','discoveredAttack','backRankMate','sacrifice','deflection'] }` | testid `section-random-mix`

**Row 2 — theme cards (`THEME_CARDS`, dynamic from `THEME_MAP`, 10 entries):**
Each card is a button that navigates to `/tactics/drill` with state `{ filterThemes: <themes> }`. testid pattern `section-{label-lower}`. file: `:128-135`.
- ⚔️ **Forks**
- 📌 **Pins & Skewers**
- 💥 **Discovered Attacks**
- 🏰 **Back Rank Mates**
- 🔥 **Sacrifices**
- ↪️ **Deflection & Decoy**
- ⚡ **Zugzwang**
- 🏁 **Endgame Technique**
- 🪤 **Opening Traps**
- 👑 **Mating Nets**

**Row 3 — bottom buttons (`BOTTOM_BUTTONS`, 2 entries):**
- **My Weaknesses** — Navigate to `/tactics/weakness-themes` | testid `section-my-weaknesses` | file: `:149-156`
- **My Mistakes** — Navigate to `/tactics/mistakes` | testid `section-my mistakes` (literal space — leave it)

Total controls on the hub: **16** (4 fixed + 10 theme + 2 bottom). All are nav targets — no in-page state changes.

---

### `/tactics/adaptive` — Adaptive Puzzles

Component: `src/components/Puzzles/AdaptivePuzzlePage.tsx` (testid `adaptive-puzzle-page`).

Three states: difficulty-select, in-session, checkpoint.

**Header (always visible):**
- **Back to difficulty select** — Returns to the difficulty picker | testid `back-button` | file: `:191-200`
- **Player rating header** — Display only; shows current rating + delta animation when rating changes | testid `player-rating-header` / `player-rating-value` / `rating-delta`

**Difficulty-select state:**
- **Classic Trainer link** — Navigate to `/tactics/classic` | testid `classic-trainer-link` | file: `:238`
- **My Mistakes link** — Navigate to `/tactics/mistakes` | testid `my-mistakes-link` | file: `:246`
- (Difficulty preset cards — easy / medium / hard / adaptive — rendered above; testids on those weren't pulled in this round)

**In-session state:**
- **Loading spinner** — Display while puzzle loads | testid `loading`
- **End session** — Bail out of the current adaptive session | testid `end-session` | file: `:273-279`
- **Puzzle board** — Drag-drop / click-move (delegated to the puzzle board component)
- **Hint button** — On the puzzle board (delegated)
- **Solution / "show answer"** — On the puzzle board (delegated)

**Checkpoint state (after every N puzzles):**
- **Checkpoint summary** — Stats display | testid `checkpoint`
- **End at checkpoint** — End the session here | testid `checkpoint-end` | file: `:300-306`
- **Continue past checkpoint** — Keep going for another batch | testid `checkpoint-continue` | file: `:307-313`

---

### `/tactics/mistakes` — My Mistakes

Component: `src/components/Puzzles/MyMistakesPage.tsx` (testid `my-mistakes-page`).

The richest filter UI in the Tactics surface.

**Header:**
- **Back to puzzles** — Navigate to `/tactics` | aria-label `Back to puzzles` | file: `:185-191`
- **Reanalyze** — Re-run AI analysis on imported games to mine new mistakes | testid `reanalyze-button` | file: `:193-201`

**Status displays:**
- **Analysis progress card** — Shown while a re-analysis is in flight | testid `analysis-progress`
- **Analysis warning** — Shown when there's a known issue (no API key, etc.) | testid `analysis-warning`
- **Stats bar** — Total mistakes, by classification, etc. | testid `stats-bar` (display)

**Phase tabs (4):**
- **Phase tab Opening / Middlegame / Endgame / All** — Filter mistakes by game phase | testid pattern `phase-tab-{phase}` | file: `:255-272`
- **Phase description** — Helper text under selected tab | testid `phase-description`

**Filter row:**
- **Classification filter** — Dropdown (blunder / mistake / inaccuracy / all) | testid `classification-filter` | file: `:291`
- **Source filter** — Dropdown (lichess / chess.com / coach / all) | testid `source-filter` | file: `:304`
- **Status filter** — Dropdown (unsolved / solved / all) | testid `status-filter` | file: `:316`
- **Opening filter chip** — Removable chip when scoped by opening | testid `opening-filter-badge` | file: `:325-332`

**Results:**
- **Empty state** — When no mistakes detected at all | shows "Import games" CTA | testid `empty-state` (CTA navigates to `/games/import`) | file: `:338-352`
- **No matches state** — When filters exclude all mistakes | testid `no-matches`
- **Puzzle list** — Grid/list of mistake cards | testid `puzzle-list` (each card testid `puzzle-card`)
- **Solve button** (per card) — Open this mistake as a puzzle | testid `solve-button` | file: `:376-382`
- **Narration preview** (per card) — One-line preview of coach commentary | testid `narration-preview`
- **Delete button** (per card) — Remove this mistake from the list | aria-label `Delete puzzle` | testid `delete-button` | file: `:413-419`

**Solving mode (overlay when a card is opened):**
- **Back-from-solving** — Close the active puzzle | (sets `activePuzzle` to null) | file: `:166-172`
- **Puzzle board** — Drag-drop / click-move (delegated)
- **Hint / try again** — On the puzzle board (delegated)

---

### `/tactics/weakness` — Weakness Puzzles

Component: `src/components/Puzzles/WeaknessPuzzlePage.tsx` (testid `tactic-drill-page` reused from the shared drill template).

**Header:**
- **Back** — Navigate to `/tactics` | testid `back-btn` | file: `:119-125`

**Loading state:**
- **Loading spinner** | testid `loading` | file: `:132`

**In-session navigation:**
- **Puzzle nav prev** — Previous puzzle in the queue | testid `nav-prev` | file: `:203-211`
- **Puzzle nav next** — Next puzzle | testid `nav-next` | file: `:215-221`
- **Puzzle board + hint + solve** — Delegated to the shared puzzle board component

**Session-summary state (end of queue):**
- **Session summary card** | testid `session-summary` | file: `:240`
- **Play again** — Reload the queue and start over | testid `play-again` | file: `:270-276`
- **Back to report** — Navigate back to `/tactics` | testid `back-to-report` | file: `:278-285`

---

### `/tactics/drill` — Tactic Drill (theme-filtered drills, also the random-mix target)

Component: `src/components/Tactics/TacticDrillPage.tsx` (testid `tactic-drill-page`).

Same shape as WeaknessPuzzle but the queue is filtered by `state.filterThemes` from the navigating link.

**Header:**
- **Back** — Navigate to `/tactics` | testid `back-btn` | file: `:213`

**In-session:**
- **Puzzle nav prev** — testid `nav-prev` | file: `:251-262`
- **Puzzle nav next** — testid `nav-next` | file: `:264-272`
- **Puzzle board + hint + solve** — Delegated to the shared puzzle-board component

**Session-summary state:**
- **Session summary** | testid `session-summary` | file: `:289`
- **Play again** — Restart the same drill | testid `play-again` | file: `:310-316`
- **View profile** — Navigate to `/tactics/profile` | file: `:318-322`

---

**Tactics-surface coverage summary:**
- Hub `/tactics`: 16 controls (all nav)
- Adaptive `/tactics/adaptive`: ~10 controls (tri-state UI: select → in-session → checkpoint)
- Mistakes `/tactics/mistakes`: ~20 controls (the richest filter set in Tactics — 3 dropdowns + phase tabs + opening chip + per-card solve/delete)
- Weakness `/tactics/weakness`: ~7 controls (back + nav + summary triad)
- Drill `/tactics/drill`: ~7 controls (same shape as Weakness)

**Pages NOT covered in Round 3a** (will need follow-up if foundation work touches them): `/tactics/profile` (TacticalProfilePage), `/tactics/setup` (TacticSetupPage), `/tactics/create` (TacticCreatePage), `/tactics/classic` (PuzzleTrainerPage — the daily-training drill), `/tactics/weakness-themes` (WeaknessThemesPage — theme-picker between hub and drill), `/tactics/lichess` (LichessDashboardPage).

Round 3b (chat intents) follows in next message.

---

## Round 3b-1 — In-game chat intercepts (`detectInGameChatIntent`)

Source: `src/services/inGameChatIntent.ts`. Fired in `GameChatPanel.handleSend` BEFORE any brain dispatch. When matched, mutates the live game directly via parent callbacks; the LLM is never called.

Returns one of four intent kinds: `mute` | `narrate` | `restart` | `play-opening`. Order matters — mute checked before narrate so "turn off voice" doesn't false-match the narrate branch.

### Intent: `mute`
- **Trigger regex** (`MUTE_RE`, file: `inGameChatIntent.ts:81-82`):
  ```
  /\b(?:mute|be\s+quiet|stop\s+talking|shut\s+up|silence|silent|turn\s+off\s+(?:the\s+)?voice|voice\s+off|disable\s+(?:voice|tts|narration|text[- ]to[- ]speech))\b/i
  ```
- **Sample phrases that match:** "mute", "be quiet", "stop talking", "shut up", "silence", "voice off", "turn off the voice", "disable narration", "disable tts", "disable text-to-speech"
- **Action:** Calls `applyNarrationToggle(false)` (defined in `coachAgentRunner.ts`) which flips both `appStore.coachVoiceOn` AND `coachSessionStore.narrationMode` to off, plus injects a chat ack

### Intent: `narrate`
- **Trigger regex** (`NARRATE_RE`, file: `inGameChatIntent.ts:73-74`):
  ```
  /\b(?:narrate|read\s+(?:it\s+)?(?:out\s+)?(?:aloud|out\s+loud)|speak\s+(?:to\s+me|aloud|out\s+loud)|talk\s+(?:to\s+me|through)|say\s+it\s+out\s+loud|out\s+loud|voice\s+(?:on|narration)|turn\s+on\s+(?:the\s+)?voice|enable\s+(?:voice|tts|text[- ]to[- ]speech|narration)|use\s+(?:voice|tts|text[- ]to[- ]speech)|text[- ]to[- ]speech)\b/i
  ```
- **Sample phrases:** "narrate", "read it aloud", "read out loud", "speak to me", "talk to me", "talk through it", "say it out loud", "voice on", "voice narration", "turn on the voice", "enable voice", "enable narration", "enable tts", "use text-to-speech"
- **Action:** Calls `applyNarrationToggle(true)` — same shape as mute, opposite direction

### Intent: `restart`
- **Trigger regex** (`RESTART_RE`, file: `inGameChatIntent.ts:65-66`):
  ```
  /\b(?:restart|reset|new\s+game|start\s+over|start\s+(?:a\s+)?new|fresh\s+(?:game|start|board)|from\s+the\s+start|back\s+to\s+(?:the\s+)?start(?:ing\s+position)?|take\s+back\s+to\s+(?:the\s+)?start(?:ing\s+position)?)\b/i
  ```
- **Sample phrases:** "restart", "reset", "new game", "start over", "start a new", "fresh game", "fresh start", "fresh board", "from the start", "back to the start", "back to the starting position", "take back to the start"
- **Action:** Fires `onRestartGame()` callback (passed into `<GameChatPanel>` from `CoachGamePage`), which invokes `handleRestart()` — wipes board, clears coach state, drops resumable snapshot

### Intent: `play-opening`
- **Trigger sources** (two paths, file: `inGameChatIntent.ts:101-127`):
  1. **Primary:** Reuses `parseCoachIntent(text)` and accepts `kind === 'play-against'` OR `kind === 'walkthrough'` when `intent.subject` is set. Subject is alias-expanded via the `OPENING_ALIASES` table (see below) and validated against `getOpeningMoves()` — must resolve to actual book moves to count.
  2. **Fallback regex** (`PLAY_OPENING_RE`, file: `:91-92`):
     ```
     /^\s*(?:let'?s\s+)?(?:play|try|do|use|go\s+with|switch\s+to)\s+(?:the\s+|a\s+|an\s+)?([a-z][a-z\s'’üäö-]{1,40}?)(?:\s+(?:against\s+me|now|please))?\s*[.!?]*\s*$/i
     ```
     Catches bare phrasings parseCoachIntent misses: "play the KID", "let's play the French", "try the Sicilian", "go with the London", "switch to the Caro-Kann"
- **Sample phrases:** "play the King's Indian against me", "let's play the Sicilian", "play the KID", "try the London", "go with the Najdorf", "switch to the Caro-Kann", "let's play the French now"
- **Action:** Fires `onPlayOpening(openingName)` callback. Triggers `handleRestart()` first then loads the opening book moves so the AI plays the named line out

### `OPENING_ALIASES` (canonical-name expansion table)

File: `inGameChatIntent.ts:35-62`. Used by both detectInGameChatIntent and `expandAlias()`. Lower-case keys, canonical-name values:

| Alias typed | Canonical opening |
|---|---|
| `kid` | King's Indian Defense |
| `kia` | King's Indian Attack |
| `qgd` | Queen's Gambit Declined |
| `qga` | Queen's Gambit Accepted |
| `qg` | Queen's Gambit |
| `qid` | Queen's Indian Defense |
| `ruy lopez` | Ruy Lopez |
| `najdorf` | Sicilian Defense: Najdorf Variation |
| `grunfeld` / `grünfeld` | Grünfeld Defense |
| `benoni` | Benoni Defense |
| `nimzo` | Nimzo-Indian Defense |
| `caro` / `caro-kann` | Caro-Kann Defense |
| `french` | French Defense |
| `sicilian` | Sicilian Defense |
| `london` | London System |
| `scandi` / `scandinavian` | Scandinavian Defense |
| `pirc` | Pirc Defense |
| `alekhine` | Alekhine Defense |
| `king's indian` / `kings indian` | King's Indian Defense |

Anything else that lowers/strips down to a key NOT in this table passes through unchanged — `getOpeningMoves` then decides whether the raw subject is recognised.


---

## Round 3b-2 — Narration toggle (`detectNarrationToggle`)

Source: `src/services/coachAgentRunner.ts`. Imported and called by **both** `CoachChatPage.tsx` and `GameChatPanel.tsx` (lines 6 / 6 of each file). Runs BEFORE the brain — when matched, the surface flips voice flags and injects an ack message; the LLM is never called for the toggle itself.

Unlike the in-game intercepts in `inGameChatIntent.ts`, this is a **heuristic detector** with compositional logic — three input checks combined.

### The detector (full source, file: `coachAgentRunner.ts:49-65`)

```ts
export function detectNarrationToggle(text: string): { enable: boolean } | null {
  const lower = text.toLowerCase();
  const hasNarrationTopic =
    /\b(narrat|commentat|commentar|voice|speak|talk|announc)/i.test(lower);
  // "shut up" stands on its own.
  if (/\bshut\s+up\b/i.test(lower)) return { enable: false };
  const offSignal =
    /\b(stop|turn\s+off|disable|silence|mute|quiet|no\s+more|cease|end)\b/i;
  if (offSignal.test(lower) && hasNarrationTopic) return { enable: false };
  const hasVerb =
    /\b(narrat|commentat|speak|voice|announce|talk\s+through)/i.test(lower);
  const hasPlayContext =
    /\b(game|play|we|move|each\s+move|during|while|turn\s+on)\b/i.test(lower);
  if (hasVerb && hasPlayContext) return { enable: true };
  return null;
}
```

### Three matching paths

| Path | Trigger | Returns |
|---|---|---|
| **1 — "shut up" standalone** | `/\bshut\s+up\b/i` (any sentence containing "shut up") | `{ enable: false }` |
| **2 — off-signal × narration topic** | `(stop\|turn off\|disable\|silence\|mute\|quiet\|no more\|cease\|end)` AND `(narrat\|commentat\|commentar\|voice\|speak\|talk\|announc)` both present | `{ enable: false }` |
| **3 — verb × play-context** | `(narrat\|commentat\|speak\|voice\|announce\|talk through)` AND `(game\|play\|we\|move\|each move\|during\|while\|turn on)` both present | `{ enable: true }` |
| _(no match)_ | none of the above | `null` (caller continues to brain dispatch) |

### Sample matches

**Returns `{ enable: false }`:**
- "shut up"
- "stop talking"
- "turn off the voice"
- "mute the coach"
- "quiet voice please"
- "disable commentary"
- "no more narration"
- "silence the announcer"
- "cease commentating"
- "end the voiceover"

**Returns `{ enable: true }`:**
- "narrate the game"
- "speak during play"
- "announce each move"
- "talk through the moves while we play"
- "turn on voice for the game"
- "commentate the moves"

**Returns `null` (passes through to brain):**
- "stop the game" — has off-signal but no narration topic
- "shut down the engine" — no "shut UP"
- "talk to me about the Sicilian" — has verb but the play-context regex requires `game/play/we/move/...`; "Sicilian" isn't in the context list (could false-negative)

### Action — `applyNarrationToggle(enable)` (file: `coachAgentRunner.ts:71-85`)

When the surface gets a non-null result, it calls:

```ts
applyNarrationToggle(enable);
```

Which atomically:
1. Sets `useCoachSessionStore.getState().setNarrationMode(enable)` — the session-level narration mode flag
2. Reads `useAppStore.getState().coachVoiceOn` — the app-level voice flag
3. Calls `toggleCoachVoice()` if the two flags disagree with the desired state (keeps both in sync)
4. Returns the ack string:
   - **enable=true:** `"Got it — I'll narrate each move out loud as we play. Starting a game now."`
   - **enable=false:** `"Narration off — I'll stay quiet and let you focus."`
5. **Side effect when enabling:** speaks the ack via `voiceService.speak(ack)` so the user hears narration immediately confirming itself. (Disabling does NOT speak — silent ack only.)

### Difference from in-game `MUTE_RE` / `NARRATE_RE` (Round 3b-1)

| Dimension | `detectInGameChatIntent` (in-game) | `detectNarrationToggle` (chat surfaces) |
|---|---|---|
| Match style | Flat single-purpose regex per intent | Compositional — multiple checks combined |
| Ambiguity tolerance | Strict — phrase must match the literal regex | Permissive — any topic word + any signal word |
| Where used | `GameChatPanel.tsx` only, inside `handleSend`'s in-game branch | Both `CoachChatPage.tsx` (home/standalone chat) AND `GameChatPanel.tsx` (called after the in-game intent check) |
| Action shape | Returns `{ kind: 'mute' }` / `{ kind: 'narrate' }`; surface dispatches to `applyNarrationToggle` | Returns `{ enable: bool }` directly; same `applyNarrationToggle` is called |
| False-positive risk | Low — has to literally say "mute" / "narrate aloud" / etc. | Medium — "stop talking about the Sicilian" hits both off-signal AND narration topic ("talk") and would mute the coach |
| False-negative risk | Medium — misses paraphrases | Lower — broader topic word list (commentat\|announc\|etc.) |

### Practical implication for foundation work (3B intent-router pre-emit)

The two detectors **overlap** in the in-game chat branch. `detectInGameChatIntent` runs first (returns `kind: mute` for `MUTE_RE`); if that doesn't match, `detectNarrationToggle` runs. Result: both pre-emit gates already cover narration — but they have slightly different acceptance criteria, so a 3B intent router should pick ONE of them (probably `detectNarrationToggle`'s heuristic since it's broader) and retire the duplicate to avoid surface-vs-shared-detector drift.

