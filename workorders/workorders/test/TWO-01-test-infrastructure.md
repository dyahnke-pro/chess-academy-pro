# TWO-01: Test Infrastructure Setup

**Status:** Not Started
**Dependencies:** WO-01
**Estimated Scope:** Vitest config, RTL setup, MSW handlers, mock factories, test utilities

---

## Objective

Set up the complete test infrastructure: Vitest configuration, React Testing Library setup, MSW mock handlers, fake-indexeddb integration, Stockfish mock worker, test utilities, and shared test helpers.

---

## Tasks

### 1. Vitest Configuration

Create/update `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['fake-indexeddb/auto', './src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/data/**', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 75,
        statements: 80,
      },
    },
  },
});
```

### 2. Test Setup File

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Reset IndexedDB between tests
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

// Mock Web Speech API
globalThis.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
  paused: false,
  pending: false,
  onvoiceschanged: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
} as unknown as SpeechSynthesis;

globalThis.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
  text: '',
  lang: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  voice: null,
  onend: null,
  onerror: null,
})) as unknown as typeof SpeechSynthesisUtterance;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver;
```

### 3. MSW Mock Handlers

Create `src/test/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Claude API
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Great move! You exploited the weak d5 square.' }],
      model: 'claude-haiku-4-5-20251001',
      usage: { input_tokens: 100, output_tokens: 50 },
    });
  }),

  // Lichess API
  http.get('https://lichess.org/api/user/:username', ({ params }) => {
    return HttpResponse.json({
      id: params.username,
      username: params.username,
      perfs: { rapid: { rating: 1500, games: 100 } },
    });
  }),

  http.get('https://lichess.org/api/games/user/:username', () => {
    return new HttpResponse(
      '{"id":"game1","rated":true,"variant":"standard","speed":"rapid","players":{"white":{"user":{"id":"testuser"},"rating":1500},"black":{"user":{"id":"opponent"},"rating":1480}},"winner":"white","moves":"e4 e5 Nf3 Nc6"}\n',
      { headers: { 'Content-Type': 'application/x-ndjson' } }
    );
  }),

  // Chess.com API
  http.get('https://api.chess.com/pub/player/:username/stats', () => {
    return HttpResponse.json({
      chess_rapid: { last: { rating: 1500 } },
    });
  }),

  http.get('https://api.chess.com/pub/player/:username/games/archives', () => {
    return HttpResponse.json({
      archives: ['https://api.chess.com/pub/player/testuser/games/2026/03'],
    });
  }),
];
```

Create `src/test/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

### 4. Stockfish Mock Worker

Create `src/test/mocks/stockfish-worker.ts`:

```typescript
// Mock Stockfish Web Worker that responds to UCI commands
// Used in tests to avoid loading real WASM

const responses: Record<string, string[]> = {
  'uci': ['id name Stockfish Mock', 'id author Test', 'uciok'],
  'isready': ['readyok'],
  'ucinewgame': [],
};

// For 'go depth N' commands, return a canned bestmove
function handleGo(): string[] {
  return [
    'info depth 15 score cp 35 nodes 1000000 nps 2000000 pv e2e4 e7e5 g1f3',
    'info depth 15 multipv 1 score cp 35 pv e2e4 e7e5 g1f3',
    'info depth 15 multipv 2 score cp 20 pv d2d4 d7d5 c2c4',
    'info depth 15 multipv 3 score cp 15 pv g1f3 d7d5 d2d4',
    'bestmove e2e4 ponder e7e5',
  ];
}
```

### 5. Test Render Utility

Create `src/test/utils.tsx`:

```typescript
import { render, RenderOptions } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/themes/ThemeProvider';

interface CustomRenderOptions extends RenderOptions {
  route?: string;
}

function renderWithProviders(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  const { route = '/', ...renderOptions } = options ?? {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MotionConfig transition={{ duration: 0 }}>
        <MemoryRouter initialEntries={[route]}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </MemoryRouter>
      </MotionConfig>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export { renderWithProviders as render };
export { screen, waitFor, within, fireEvent } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

### 6. Test Data Factories

Create `src/test/factories.ts`:

```typescript
// Factory functions for creating test data with sensible defaults

function createPuzzle(overrides?: Partial<PuzzleRecord>): PuzzleRecord;
function createOpening(overrides?: Partial<OpeningRecord>): OpeningRecord;
function createGame(overrides?: Partial<GameRecord>): GameRecord;
function createFlashcard(overrides?: Partial<FlashcardRecord>): FlashcardRecord;
function createProfile(overrides?: Partial<UserProfile>): UserProfile;
function createSession(overrides?: Partial<SessionRecord>): SessionRecord;
```

### 7. Database Test Helper

Create `src/test/dbHelper.ts`:

```typescript
// Seed the test database with fixture data
async function seedPuzzles(count?: number): Promise<PuzzleRecord[]>;
async function seedOpenings(): Promise<OpeningRecord[]>;
async function seedGames(count?: number): Promise<GameRecord[]>;
async function clearDatabase(): Promise<void>;
```

---

## Acceptance Criteria

- [ ] `npm run test:run` executes with zero configuration errors
- [ ] Vitest finds and runs a basic smoke test
- [ ] fake-indexeddb provides a working IndexedDB in tests
- [ ] MSW intercepts API calls correctly
- [ ] Stockfish mock worker responds to UCI commands
- [ ] `renderWithProviders` wraps components with all necessary providers
- [ ] Factory functions produce valid test data
- [ ] Coverage report generates with correct thresholds
- [ ] Web Speech API mock prevents errors in tests

---

## Files Created

```
vitest.config.ts
src/
  test/
    setup.ts
    utils.tsx
    factories.ts
    dbHelper.ts
    mocks/
      handlers.ts
      server.ts
      stockfish-worker.ts
```
