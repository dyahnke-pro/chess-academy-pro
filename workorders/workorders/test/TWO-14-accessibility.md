# TWO-14: Accessibility Tests

**Status:** Not Started
**Dependencies:** WO-02, TWO-01

---

## Objective

Verify WCAG 2.2 AA compliance across the app, with special attention to the chess board.

---

## Test Suites

### 1. axe-core Automated Tests (`src/test/accessibility.test.tsx`)

Run axe-core on every major page component:

- DashboardPage: no violations
- PuzzlesPage: no violations
- OpeningsPage: no violations
- GamesPage: no violations
- StatsPage: no violations
- SettingsPage: no violations
- KidHomePage: no violations

### 2. Chess Board Accessibility (`src/components/board/ChessBoard.a11y.test.tsx`)

- Board has `role="grid"`
- Squares have `role="gridcell"`
- Each square has `aria-label` (e.g., "e4, white pawn")
- Empty squares labeled "e5, empty"
- Selected piece announced
- Check status announced via `aria-live`
- Legal moves communicated to screen reader

### 3. Keyboard Navigation Tests

- Tab cycles through interactive elements in correct order
- Arrow keys navigate the board (if focused)
- Enter/Space activate buttons
- Escape closes modals and dialogs
- Focus visible on all interactive elements
- Skip navigation link works

### 4. Color Contrast Tests

- All themes meet WCAG AA contrast ratio (4.5:1 for text)
- Error/success colors distinguishable
- Move annotations readable on board background
- Kid Mode colors meet contrast requirements

---

## Files Created

```
src/test/accessibility.test.tsx
src/components/board/ChessBoard.a11y.test.tsx
```
