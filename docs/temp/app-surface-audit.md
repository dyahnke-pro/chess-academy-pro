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
