# TWO-12: E2E Tests — Core User Flows

**Status:** Not Started
**Dependencies:** WO-09, TWO-01

---

## Objective

End-to-end tests using Playwright that verify complete user workflows through the app.

---

## Setup

### Playwright Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

---

## Test Suites

### 1. Onboarding Flow (`e2e/onboarding.spec.ts`)

- New user sees onboarding wizard
- Can complete all steps (profile, API key skip, preferences)
- After onboarding, redirected to dashboard
- Subsequent visits skip onboarding

### 2. Puzzle Training Flow (`e2e/puzzles.spec.ts`)

- Navigate to Puzzles page
- Start training → puzzle loads on board
- Make correct move → success indicator shown
- SRS buttons appear → click "Good"
- Next puzzle loads
- Puzzle rating updates

### 3. Opening Study Flow (`e2e/openings.spec.ts`)

- Navigate to Openings page
- See repertoire list
- Click an opening → detail page loads
- Move tree is interactive (click moves, board updates)
- Start drill → opponent moves auto-play
- Complete drill → accuracy shown

### 4. Game Import Flow (`e2e/import.spec.ts`)

- Navigate to Games > Import
- Enter Lichess username
- Import games → games appear in list
- Click a game → game viewer loads
- Navigate through moves with controls

### 5. Dashboard Flow (`e2e/dashboard.spec.ts`)

- Dashboard loads with session plan
- Stats display correctly
- Quick action buttons navigate to correct pages
- Streak counter displays

### 6. Settings Flow (`e2e/settings.spec.ts`)

- Navigate to Settings
- Change theme → visual change immediate
- Change coach personality → preference saved
- API key entry works (test with mock)

---

## Files Created

```
playwright.config.ts
e2e/
  onboarding.spec.ts
  puzzles.spec.ts
  openings.spec.ts
  import.spec.ts
  dashboard.spec.ts
  settings.spec.ts
```
