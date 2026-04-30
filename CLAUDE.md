# CLAUDE.md — Chess Academy Pro

This file is loaded automatically in every Claude Code session. Follow these instructions exactly.

## ⏰ Standing notes

**iOS AVAudioSession patch — DONE.** Lives in
`ios-patches/App/AppDelegate.swift` and is copied over the Capacitor
default by `npm run setup:ios`. Sets category `.playAndRecord` with
`.mixWithOthers`, `.allowBluetooth`, `.defaultToSpeaker` so Polly TTS
and Web Speech mic input survive Bluetooth route changes and the
ringer switch. Keep the patch in sync when `cap sync` regenerates
`ios/` — see `ios-patches/README.md`.

## Project Overview

Chess Academy Pro is an AI-powered chess training PWA built with React + TypeScript + Vite. It wraps as a native iOS app via Capacitor and is distributed through TestFlight. The app features an LLM-powered chess coach (Claude API), Stockfish WASM analysis, spaced repetition puzzles, opening training, and adaptive difficulty.

**Single user app** — built for one person (the developer's brother). No multi-tenancy, no auth beyond optional Supabase cloud sync.

## Tech Stack (exact versions)

- React 19.2.4 + ReactDOM 19.2.4
- TypeScript 5.9.3 (strict mode)
- Vite 7.3.1 + @vitejs/plugin-react 5.1.4
- Tailwind CSS 4.2.1
- React Router DOM 7.13.1
- chess.js 1.4.0
- react-chessboard 5.10.0
- stockfish 18.0.5 (WASM, Web Worker)
- Dexie.js 4.3.0 (IndexedDB)
- Zustand 5.0.11 (state management)
- Recharts 3.7.0
- Framer Motion 12.34.4
- openai 6.27.0 (DeepSeek provider, baseURL: https://api.deepseek.com)
- @anthropic-ai/sdk (Anthropic provider)
- Lucide React 0.576.0 (icons)
- Capacitor 8.1.0 (core + cli + ios)

## Code Conventions

### TypeScript
- **Strict mode always.** No `any` types. Use `unknown` + type guards when types are uncertain.
- Prefer `interface` over `type` for object shapes. Use `type` for unions/intersections.
- All function parameters and return types must be explicitly typed.
- Use `const` by default. Use `let` only when reassignment is needed. Never `var`.

### React
- Functional components only. No class components.
- Use named exports, not default exports.
- Component files: PascalCase (`PuzzleTrainer.tsx`).
- Hook files: camelCase prefixed with `use` (`useChessEngine.ts`).
- One component per file. Co-locate styles, hooks, and types when small.
- Prefer composition over prop drilling. Use Zustand for shared state.

### File Organization
```
src/
  components/     # React components grouped by feature
  hooks/          # Custom React hooks
  stores/         # Zustand stores
  services/       # Business logic, API clients, engine wrapper
  data/           # Static JSON data (openings, puzzles, etc.)
  types/          # Shared TypeScript interfaces/types
  utils/          # Pure utility functions
  test/           # Test setup, mocks, helpers
```

### Styling
- Tailwind CSS utility classes only. No CSS modules, no styled-components, no inline styles.
- Use Tailwind's design system (spacing, colors, typography) consistently.
- Theme colors defined in Tailwind config and referenced by semantic names.
- Responsive: mobile-first. Use `sm:`, `md:`, `lg:` breakpoints.

### UI Design Language (IMPORTANT)
**All hub/landing pages must match the Dashboard pattern.** This means:
- Centered title at top
- `SmartSearchBar` below title (on all non-playing pages)
- **2-column grid** of big tap targets: `grid grid-cols-2 gap-3 flex-1 content-center max-w-lg mx-auto w-full`
- Each section button: `border-2 rounded-2xl`, tinted bg (`bg-{color}-500/10`), tinted border (`border-{color}-500/30`), centered icon + bold label
- First item spans 2 columns (`col-span-2 py-10`), rest are `aspect-square`
- Each section owns a color (Tailwind opacity classes, not CSS variables)
- Container: `flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-20 md:pb-6`
- Content constrained to `max-w-lg mx-auto`

**When "clean up" or "make it match" is requested, match BOTH structure AND visual.** Don't just reorganize information flow — replicate the actual layout, grid, card style, spacing, and interaction patterns of the reference page. Study the reference's exact JSX, Tailwind classes, and component hierarchy before writing new code.

### Boards and Lesson Layouts (IMPORTANT)
Every board in the app must go through `ConsistentChessboard` (`src/components/Chessboard/ConsistentChessboard.tsx`). Two modes:
- **Controlled:** `<ConsistentChessboard game={useChessGame()} ... />` — for interactive lesson/coach/play screens.
- **Static:** `<ConsistentChessboard fen={fenStringOrPositionMap} ... />` — for inline boards that own their own chess instance (Kid games, model-game viewers).

Theming (piece set, square colors, glow, animation duration, border) is centralized in `useBoardTheme()` (`src/hooks/useBoardTheme.ts`). Do NOT pass piece set / square color / animation overrides at the call site — they are pinned by the hook for visual consistency.

Any "lesson with a board" screen (walkthrough, dynamic coach session, middlegame study) should use `ChessLessonLayout` (`src/components/Layout/ChessLessonLayout.tsx`). It guarantees: fixed gap above controls, board-height cap on short viewports, and mobile bottom-nav clearance via `env(safe-area-inset-bottom)`.

### Strict Narration Timing (IMPORTANT)
Lesson playback (TTS + auto-advance) must use `useStrictNarration` (`src/hooks/useStrictNarration.ts`) for low-level control, or `useWalkthroughRunner` (`src/hooks/useWalkthroughRunner.ts`) for full-session orchestration over a `WalkthroughSession`. Voice-promise resolution is the single source of truth for advance — do NOT add fallback timers that race with `voiceService.speak()`. Manual navigation cancels in-flight speech and supersedes pending callbacks via the hook's token counter.

Spoken text comes from `pickNarrationText(annotation, length)` (`src/services/walkthroughNarration.ts`). New annotations should populate the optional `narration` and `shortNarration` fields on `OpeningMoveAnnotation` so the spoken script can diverge from the displayed annotation when needed; otherwise the helper falls back to the display text.

### State Management
- **Zustand** for global app state (user profile, settings, current session, theme).
- **React state** (`useState`) for local component state only.
- **Dexie.js** for persistent data (puzzles, games, SRS cards, opening progress).
- Never duplicate state between Zustand and Dexie — Zustand holds runtime state, Dexie holds persistent data.

### Naming
- Variables/functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase` (e.g., `PuzzleRecord`, `CoachPersonality`)
- Files: match what they export (`PuzzleTrainer.tsx`, `useStockfish.ts`, `srsEngine.ts`)
- Test files: co-located as `ComponentName.test.tsx` or `moduleName.test.ts`

## Testing Requirements

- All new features MUST have corresponding tests.
- Run `npm test` before committing. All tests must pass.
- Run `npm run lint` before committing. No errors allowed.
- Test files live next to source files: `Foo.tsx` -> `Foo.test.tsx`

### Test Stack
- **Vitest 4.0.18** — unit + component tests
- **React Testing Library 16.3.2** — component rendering + interaction
- **MSW 2.12.10** — API mocking (Lichess, Chess.com, Claude API)
- **fake-indexeddb 6.2.5** — IndexedDB mocking (auto-loaded in setup)
- **Playwright 1.58.2** — E2E tests

### Test Commands
```bash
npm test              # Vitest in watch mode
npm run test:run      # Vitest single run
npm run test:coverage # Vitest with coverage
npm run test:e2e      # Playwright
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

### Mocking Conventions
- **Stockfish:** Mock via `src/test/mocks/stockfish-worker.ts` — returns canned UCI responses. For `stockfishEngine.ts` tests, use `vi.stubGlobal('Worker', ...)` with a class mock.
- **IndexedDB:** Auto-mocked via `fake-indexeddb/auto` in vitest setup. Use `db.delete(); db.open()` in `beforeEach` for test isolation.
- **External APIs:** MSW handlers in `src/test/mocks/handlers.ts`. Use `server.use()` for per-test handler overrides.
- **Web Speech API:** Stubbed in `src/test/setup.ts`. When using `vi.resetModules()`, re-stub `SpeechSynthesisUtterance` as a class (not a function) to preserve constructor behavior.
- **AudioContext:** Conditionally stubbed in `src/test/setup.ts` using `if (typeof globalThis.AudioContext === 'undefined')` so test-level stubs take precedence.
- **chess.js:** Do NOT mock — use the real library in tests
- **Framer Motion:** Wrap with `<MotionConfig transition={{ duration: 0 }}>` in test utils

### Test Data Factories
Use `src/test/factories.ts` for all test data. Available builders:
- `buildUserProfile()`, `buildPuzzleRecord()`, `buildOpeningRecord()`, `buildGameRecord()`
- `buildFlashcardRecord()`, `buildSessionRecord()`, `buildCoachGameState()`, `buildChatMessage()`, `buildBadHabit()`
- Each accepts `Partial<T>` overrides and returns valid defaults with auto-incrementing IDs.
- Call `resetFactoryCounter()` in `beforeEach` if test relies on predictable IDs.

### Testing Best Practices
- **Component tests:** Mock service imports with `vi.mock()`, use `renderWithProviders` (or `render` from `src/test/utils.tsx`), use `waitFor` for async state updates.
- **Zustand store tests:** Test directly via `useAppStore.getState()` + action calls. Call `reset()` in `beforeEach` for isolation. No React rendering needed.
- **DB integration tests:** Use real fake-indexeddb, not mocks. Test index queries (`where().equals()`, `where().between()`) against actual Dexie operations.
- **Module isolation:** Use `vi.resetModules()` + dynamic `await import()` only when testing singleton modules that need fresh instances per test (e.g., `speechService`).
- **Accessibility tests:** Use `vitest-axe` for automated checks (`axe(container)` returns `{ violations }`) + manual ARIA attribute assertions. Keep axe tests focused on simple components to avoid timeouts.
- **E2E tests:** Playwright config in `playwright.config.ts`. Tests in `e2e/` directory. Use `data-testid` selectors for reliability.

## Git Conventions

- Commit messages: imperative mood, max 72 chars first line
- Format: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`
- One logical change per commit
- Do NOT commit `.env` files, API keys, or `node_modules`

## Standing Orders for Work Orders

These rules apply to every work order. They don't get "completed" —
they must be satisfied whenever the WO touches the listed surface.

- **Any WO changing Supabase schema MUST produce a migration file + RLS policies.**
- **Any WO adding a Dexie store MUST bump version + add upgrade function.**
- **Any WO adding a new route MUST register it in `router.tsx` AND add a nav entry.**
- **Any WO adding a new UI surface MUST include loading, empty, and error states.**
- **Any WO adding a user-facing feature MUST declare: feature flag name, nav entry, activation cue, post-completion route.**
- **Any WO gating on a user flag MUST specify retroactive handling for existing users.**
- **Any WO adding events MUST document PostHog event names + properties.**

## Do NOT

- Use `any` type
- Use default exports
- Use CSS-in-JS or inline styles
- Use class components
- Add comments for self-evident code
- Add features not specified in the current work order
- Skip tests
- Use `localStorage` for anything (use Dexie/IndexedDB)
- Import from `openai` anywhere except `src/services/coachApi.ts`
- Run Stockfish anywhere except through `src/services/stockfishEngine.ts`

## Agent Coach Pattern (WO-AGENT-COACH)

All lesson-style surfaces — opening walkthroughs, middlegame plans,
coach-run drills, play-against sessions — share the same substrate.
When you add a new lesson flow, reuse these primitives:

### Shared components
- **`src/components/Chessboard/ConsistentChessboard.tsx`** — the only
  board wrapper for lesson views. Narrow API (`fen`, `arrows`,
  `highlights`, `interactive`, `onMove`, `maxWidth`) over the existing
  `ControlledChessBoard`. Keeps piece style / colors / arrow colors /
  animation timing identical everywhere. Do not render
  `ControlledChessBoard` or `react-chessboard` directly in new lesson
  screens.
- **`src/components/Layout/ChessLessonLayout.tsx`** — header / board /
  controls / footer slots with safe-area and thumb-zone spacing. Caps
  the board height so the control row never scrolls off-screen on
  mobile. Wrap every lesson page with this.

### Shared types / services
- **`src/types/walkthrough.ts`** — `WalkthroughStep` (narration
  embedded with the move) and `WalkthroughSession`. This is the
  canonical lesson data shape.
- **`src/services/walkthroughAdapter.ts`** — `buildStepsFromPgn()` /
  `buildSession()` convert legacy PGN + parallel annotation arrays
  into `WalkthroughStep[]`. chess.js is the truth for SAN/fenAfter;
  mismatches warn in dev.
- **`src/services/walkthroughRunner.ts`** + **`src/hooks/useWalkthroughRunner.ts`**
  drive playback with strict voice-gated timing. Board updates
  instantly on step change; auto-advance is gated on
  `voiceService.speak()` resolving; a word-count backup timer is a
  safety net only. Use this hook for any new auto-advancing lesson.
- **`src/services/coachAgent.ts`** — `parseCoachIntent()` routes
  natural-language coach queries to `continue-middlegame`,
  `play-against`, `puzzle`, `walkthrough`, or `qa`. Deterministic
  regex-first so sessions start instantly without an LLM round-trip.
- **`src/services/middlegamePlanner.ts`** — resolves a middlegame
  plan (by openingId or subject) from `middlegame-plans.json` into a
  `WalkthroughSession`. **Keeps the plan's critical-position FEN so
  opening→middlegame board context carries over — do not reset.**
- **`src/services/coachPlaySession.ts`** — rating-matched Stockfish
  config (with explicit easy/medium/hard override). Always resolve
  via `resolveConfig(difficulty, rating)`.

### Routing
- **`/coach/session/:kind`** (`CoachSessionPage.tsx`) — the entry
  point for any coach-initiated lesson. URL query carries context
  (`?subject=...&orientation=...&difficulty=...`). `SmartSearchBar`
  surfaces an "Start session" top-of-dropdown suggestion whenever
  `parseCoachIntent` matches a routable kind.

### Rules of thumb
- Never render `react-chessboard` or `ControlledChessBoard` directly
  in a new lesson view — use `ConsistentChessboard`.
- Never build your own play/pause/advance timers — use
  `useWalkthroughRunner`.
- Never hard-code Stockfish strength — go through
  `coachPlaySession.resolveConfig`.
- Never pass narration in a parallel array — embed it on the
  `WalkthroughStep`.

## Deployment Policy

**Push every build directly to `main`. No feature branches, no PRs, no
preview deploys.** Dave wants every change to land on production
immediately. Workflow:

1. Run tests, typecheck, lint — fix any failures
2. Commit with a clear message on `main`
3. `git push origin main` — Vercel picks it up and deploys
4. iOS/TestFlight builds are produced locally via Capacitor when needed

Do NOT create feature branches, do NOT open PRs, do NOT merge through
the UI. The previous "branch + PR + merge" flow is retired — Vercel
preview builds add latency without value for a single-developer app.

Never ask "want me to merge?" / "want me to push?" — just push to main.

## Before Finishing a Session

1. All tests pass (`npm run test:run`)
2. No TypeScript errors (`npm run typecheck`)
3. No lint errors (`npm run lint`)
4. Update MANIFEST.md — mark completed work orders, note any blockers
5. If you created new files, verify they follow the file organization rules above
6. Merge and deploy (see Deployment Policy above)
