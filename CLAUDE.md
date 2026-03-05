# CLAUDE.md — Chess Academy Pro

This file is loaded automatically in every Claude Code session. Follow these instructions exactly.

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
- @anthropic-ai/sdk 0.78.0
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

## Do NOT

- Use `any` type
- Use default exports
- Use CSS-in-JS or inline styles
- Use class components
- Add comments for self-evident code
- Add features not specified in the current work order
- Skip tests
- Use `localStorage` for anything (use Dexie/IndexedDB)
- Import from `@anthropic-ai/sdk` anywhere except `src/services/coachApi.ts`
- Run Stockfish anywhere except through `src/services/stockfishEngine.ts`

## Before Finishing a Session

1. All tests pass (`npm run test:run`)
2. No TypeScript errors (`npm run typecheck`)
3. No lint errors (`npm run lint`)
4. Update MANIFEST.md — mark completed work orders, note any blockers
5. If you created new files, verify they follow the file organization rules above
