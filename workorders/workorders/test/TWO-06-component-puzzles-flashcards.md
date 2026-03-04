# TWO-06: Component Tests — Puzzles & Flashcards

**Status:** Not Started
**Dependencies:** WO-06, WO-10, TWO-01

---

## Test Suites

### 1. PuzzleSolver Tests (`src/components/puzzles/PuzzleSolver.test.tsx`)

- Renders puzzle position on the board
- Shows "Your turn" indicator after opponent move
- Correct move: green highlight appears
- Wrong move: red highlight + shake effect
- Multi-move puzzle progresses through all moves
- Puzzle completion shows result banner
- SRS buttons appear after puzzle completion

### 2. SrsButtons Tests (`src/components/puzzles/SrsButtons.test.tsx`)

- Renders 4 buttons with correct labels
- Each button shows interval preview text
- Clicking "Good" calls onGrade with correct grade
- Buttons disabled while loading
- Correct color coding per button

### 3. ThemeFilter Tests (`src/components/puzzles/ThemeFilter.test.tsx`)

- Renders all 10 tactical themes
- Shows accuracy % per theme
- Selecting a theme calls onFilter
- "All Themes" option is available
- Weakest theme is visually highlighted

### 4. FlashcardReview Tests (`src/components/flashcards/FlashcardReview.test.tsx`)

- Card front shows question
- Clicking card flips to show answer
- SRS buttons appear after flip
- Progress indicator shows "Card N of M"
- Empty state when no cards due

### 5. Card Type Tests

- BestMoveCard: shows board + question, reveals move on flip
- NameOpeningCard: shows moves, reveals opening name on flip
- ExplainIdeaCard: shows position, reveals explanation on flip

---

## Files Created

```
src/components/puzzles/PuzzleSolver.test.tsx
src/components/puzzles/SrsButtons.test.tsx
src/components/puzzles/ThemeFilter.test.tsx
src/components/flashcards/FlashcardReview.test.tsx
src/components/flashcards/BestMoveCard.test.tsx
src/components/flashcards/NameOpeningCard.test.tsx
src/components/flashcards/ExplainIdeaCard.test.tsx
```
