# MANIFEST.md — Chess Academy Pro Progress Tracker

Last updated: 2026-03-04

---

## Build Work Orders

| WO | Title | Status | Dependencies | Notes |
|----|-------|--------|-------------|-------|
| WO-01 | Project Scaffolding | ✅ Complete | — | Vite + React + TS + Tailwind + Router + Zustand + Dexie + Capacitor |
| WO-02 | Interactive Chess Board | ✅ Complete | WO-01 | Full board: drag/drop, click-to-move, legal move dots, last-move/check highlights, flip+undo+reset buttons, eval bar (EvalBar.tsx), 4 theme-matched piece sound sets (soundService.ts + usePieceSound.ts), Kid Mode sounds, enhanced useChessGame hook (position/isCheck/legalMoves/onDrop/onSquareClick/flipBoard/undoMove/resetGame). 138 tests. |
| WO-03 | Opening Database & Data Layer | ✅ Complete | WO-01 | 159-entry ECO JSON, 40 annotated repertoire openings (20W+20B, Danya voice), Woodpecker Method fields on OpeningRecord, dataLoader.ts (seedDatabase/loadEcoData/loadRepertoireData/seedFlashcardsForRepertoire), openingService.ts (getRepertoireOpenings/getOpeningById/getOpeningByEco/searchOpenings/updateDrillProgress/getWeakestOpenings/getWoodpeckerDue/updateWoodpecker), flashcardService.ts (generate/review/query), DB schema v2 with meta table. 192 tests. |
| WO-04 | Opening Explorer UI | ✅ Complete | WO-02, WO-03 | OpeningExplorerPage (list view, search, color filter, OpeningCard), OpeningDetailPage (study/drill toggle, board+FEN sync, move navigation, overview/keyIdeas/traps/warnings panels, progress stats), MoveTree.tsx (PGN parser, main line + variation rendering, click-to-navigate, active move highlighting), DrillMode.tsx (auto-play opponent moves, move validation, timer, Woodpecker stats, speech commentary via speechService, celebration/encouragement sounds, retry/exit). 241 tests. |
| WO-05 | Puzzle Data & SRS Engine | ✅ Complete | WO-01 | 1002 puzzles covering all 10 tactical themes (fork, pin, skewer, discoveredAttack, backRankMate, sacrifice, deflection, zugzwang, endgame variants, openingTrap, mateIn1-3), puzzleService.ts (seedPuzzles, ELO K=32 adaptive rating, per-theme skill tracking, daily puzzle selection with SRS/weakness/rating-band priority, recordAttempt with SRS scheduling), 5 puzzle modes (standard, timed_blitz 30s, daily_challenge, opening_traps, endgame), getPuzzleStats. 241 tests. |
| WO-06 | Puzzle Trainer UI | ✅ Complete | WO-02, WO-05 | PuzzleTrainerPage (mode selector → puzzle session), PuzzleBoard (auto-play opponent, move validation, multi-move sequences, theme-based speech feedback), SrsGradeButtons (4 buttons with interval previews from srsEngine), PuzzleTimer (30s countdown for blitz), PuzzleSessionStats (solved/failed/streak/rating change), PuzzleModeSelector (5 mode cards), useSolveTimer hook. 262 tests. |
| WO-07 | Coach System — Core | Not Started | WO-01 | Claude API integration, 3 personalities, streaming, prompt caching, offline fallback |
| WO-08 | Coach System — Features | Not Started | WO-07, WO-11 | Post-game analysis, daily lessons, bad habits, weekly reports |
| WO-09 | Dashboard & Session Generator | Not Started | WO-05, WO-07 | Daily session, skill bars, streak, XP, session timer |
| WO-10 | Flashcard System | Not Started | WO-03, WO-05 | SRS flashcards, card types, opening memorization, due cards |
| WO-11 | Stockfish Integration | Not Started | WO-02 | WASM engine, Web Worker, eval bar, analysis mode, platform detection |
| WO-12 | Game Database & PGN Viewer | Not Started | WO-02, WO-11 | Master games, PGN import/export, move navigation, annotations |
| WO-13 | Lichess & Chess.com Import | Not Started | WO-12 | API integration, game import, opening detection, blunder report |
| WO-14 | Stats & Performance Dashboard | Not Started | WO-05, WO-09 | Charts, radar, history, heatmap, bad habit tracker |
| WO-15 | Kid Mode | Not Started | WO-02, WO-07 | Child profile, simplified UI, piece learning, mini-games, parent dashboard |
| WO-16 | Theme System | Not Started | WO-01 | All 7 themes, custom builder, piece sets, board colors |
| WO-17 | Gamification | Not Started | WO-09 | XP, levels, achievements, badges, coach unlockables |
| WO-18 | API Key Onboarding & Settings | Not Started | WO-07 | Key entry, Web Crypto encryption, model selection, budget display |
| WO-19 | Cloud Sync | Not Started | WO-01 | Supabase auth, backup, cross-device sync |
| WO-20 | PWA & Offline | Not Started | WO-01 | Service worker, caching strategy, offline detection, install prompt |
| WO-21 | Capacitor Build & TestFlight | Not Started | WO-20 | iOS build, Xcode config, TestFlight upload, COOP/COEP headers |
| WO-22 | Polish & Performance | Not Started | All | Animations, loading states, error boundaries, bundle optimization |

---

## Test Work Orders

| TWO | Title | Status | Dependencies | Notes |
|-----|-------|--------|-------------|-------|
| TWO-01 | Test Infrastructure Setup | Not Started | WO-01 | Vitest, RTL, MSW, fake-indexeddb, mocks, setup files |
| TWO-02 | Unit Tests — Chess Logic & SRS | Not Started | WO-02, WO-05, TWO-01 | chess.js integration, SM-2 algorithm, puzzle rating |
| TWO-03 | Unit Tests — State Management | Not Started | WO-09, TWO-01 | Zustand stores, computed state, async actions |
| TWO-04 | Unit Tests — Coach System | Not Started | WO-07, TWO-01 | Templates, prompt generation, API handling, cost tracking |
| TWO-05 | Component Tests — Board & Game | Not Started | WO-02, TWO-01 | Chessboard rendering, drag/drop, move highlighting |
| TWO-06 | Component Tests — Puzzles & Flashcards | Not Started | WO-06, WO-10, TWO-01 | Puzzle UI, SRS buttons, flashcard flow |
| TWO-07 | Component Tests — Openings & Games | Not Started | WO-04, WO-12, TWO-01 | Opening tree, game viewer, PGN navigation |
| TWO-08 | Component Tests — Dashboard & Stats | Not Started | WO-09, WO-14, TWO-01 | Charts, radar, session display |
| TWO-09 | Integration Tests — Stockfish WASM | Not Started | WO-11, TWO-01 | Engine service, UCI protocol, analysis results |
| TWO-10 | Integration Tests — IndexedDB/Dexie | Not Started | WO-03, TWO-01 | CRUD operations, migrations, bulk ops, data integrity |
| TWO-11 | Integration Tests — External APIs | Not Started | WO-13, WO-07, TWO-01 | Lichess, Chess.com, Claude API (via MSW) |
| TWO-12 | E2E Tests — Core User Flows | Not Started | WO-09, TWO-01 | Playwright: onboarding, puzzle session, opening study, game import |
| TWO-13 | E2E Tests — Offline & PWA | Not Started | WO-20, TWO-12 | Offline mode, service worker caching, data persistence |
| TWO-14 | Accessibility Tests | Not Started | WO-02, TWO-01 | axe-core, ARIA roles, keyboard navigation, screen reader |
| TWO-15 | Performance Tests & Benchmarks | Not Started | WO-11, WO-05, TWO-01 | Stockfish speed, IndexedDB throughput, bundle size |

---

## Milestone Targets

| Milestone | Work Orders | Description |
|-----------|------------|-------------|
| **M1: Playable Board** | WO-01, WO-02, TWO-01 | App scaffolded, interactive board works |
| **M2: Core Training** | WO-03–WO-06, TWO-02 | Openings + puzzles with SRS |
| **M3: AI Coach** | WO-07, WO-08, WO-18, TWO-04 | Coach speaks, analyzes, teaches |
| **M4: Engine & Import** | WO-11–WO-13, TWO-09–TWO-11 | Stockfish + game import pipeline |
| **M5: Full Experience** | WO-09, WO-10, WO-14–WO-17, TWO-03–TWO-08 | Dashboard, stats, kid mode, themes, gamification |
| **M6: Ship It** | WO-18–WO-22, TWO-12–TWO-15 | PWA, Capacitor, TestFlight, polish |

---

## Known Issues & Blockers

| # | Issue | Status | Blocking |
|---|-------|--------|----------|
| — | — | — | — |

---

## Session Log

| Date | Session | Work Orders Touched | Notes |
|------|---------|-------------------|-------|
| 2026-03-02 | 1 | WO-01 | Scaffolding complete: package.json, tsconfig, vite, tailwind, capacitor, Dexie schema, Zustand store, theme system, SRS engine, coach prompts, all service stubs, test infrastructure |
| 2026-03-02 | 2 | WO-02 | Interactive chess board: useChessGame hook, ChessBoard component, drag/drop, click-select, legal move hints, last-move/check highlights, flip button, responsive sizing. 56 tests passing, 0 lint errors, 0 type errors. Also fixed lint/type errors in stockfishEngine.ts, coachApi.ts, speechService.ts, themeService.ts, DashboardPage.tsx, srsEngine.test.ts; updated PostCSS config for Tailwind v4. |
| 2026-03-03 | 3 | WO-02 | Completed all remaining WO-02 requirements: undo/reset buttons, EvalBar component (animated Framer Motion, clamp ±10 pawns, mate notation), soundService.ts (4 sound sets × 4 types, SoundService class, pieceSetToSoundSet), usePieceSound.ts hook (Kid Mode volume, celebration/encouragement sounds), enhanced useChessGame hook (position/isCheck aliases, legalMoves/selectedSquare/boardOrientation state, onDrop/onSquareClick/flipBoard/undoMove/resetGame/clearSelection handlers). 138 tests passing, 0 lint errors, 0 type errors. |
| 2026-03-03 | 4 | WO-03 | Opening Database & Data Layer complete: openings-eco.json (159 entries A–E), repertoire.json (40 openings with Danya-voice annotations), Woodpecker Method fields on OpeningRecord, DB schema v2 (meta table), dataLoader.ts, openingService.ts, flashcardService.ts. Fixed isRepertoire boolean-index issue (use .filter() not .where().equals(1)). 192 tests passing, 0 lint errors, 0 type errors. |
| 2026-03-04 | 5 | WO-03, WO-04, WO-05 | Fixed remaining WO-03 bug (flashcardService .where().equals(1) → .filter()). Moved board control buttons (flip/undo/reset) from absolute overlay to below-board row with text labels — fixes knight/rook movement blocking. Implemented WO-04: MoveTree, OpeningExplorerPage, OpeningDetailPage, DrillMode with Woodpecker Method and speech commentary. Implemented WO-05: 1002 puzzles across all 10 tactical themes, ELO-style adaptive difficulty (K=32), per-theme skill tracking, daily puzzle selection algorithm, 5 puzzle modes, full SRS integration. Verified Kid Mode sounds (cartoon set, volume 1.0, celebration/encouragement). Full QA pass: 241 tests passing, 0 lint errors, 0 type errors. |
| 2026-03-04 | 6 | WO-06 | Puzzle Trainer UI complete: PuzzleTrainerPage with mode selector, PuzzleBoard with auto-play opponent + move validation + theme speech, SrsGradeButtons with interval previews, PuzzleTimer (30s blitz countdown), PuzzleSessionStats, PuzzleModeSelector (5 modes), useSolveTimer hook. Updated /puzzles route. 262 tests passing, 0 lint errors, 0 type errors. |
