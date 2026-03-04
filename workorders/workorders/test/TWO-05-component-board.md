# TWO-05: Component Tests — Board & Game Components

**Status:** Not Started
**Dependencies:** WO-02, TWO-01
**Estimated Scope:** ChessBoard, MoveHistory, BoardControls, PromotionDialog

---

## Objective

Write React Testing Library component tests for the chess board and related game components.

---

## Test Suites

### 1. ChessBoard Tests (`src/components/board/ChessBoard.test.tsx`)

- Renders 64 squares
- Starting position shows all pieces in correct positions
- Custom FEN renders correct piece placement
- Board orientation: white at bottom by default
- Board orientation: flipped when `orientation="black"`
- Read-only mode disables piece interaction
- Board is responsive (renders at container size)

### 2. MoveHistory Tests (`src/components/board/MoveHistory.test.tsx`)

- Empty game shows no moves
- Moves render in two-column format (White | Black)
- Move numbers are correct
- Current move is highlighted
- Clicking a move calls onMoveClick with correct index
- Game result displayed at end ("1-0", "0-1", "1/2-1/2")
- Long games scroll correctly
- Move annotations (!, ?, ??, etc.) display when present

### 3. BoardControls Tests (`src/components/board/BoardControls.test.tsx`)

- All 4 navigation buttons render (start, back, forward, end)
- Flip button renders
- Start button disabled at move 0
- Back button disabled at move 0
- Forward button disabled at last move
- End button disabled at last move
- Clicking forward calls onForward
- Clicking back calls onBack
- Flip button calls onFlip

### 4. PromotionDialog Tests (`src/components/board/PromotionDialog.test.tsx`)

- Renders 4 piece options (Queen, Rook, Bishop, Knight)
- Clicking Queen calls onSelect with 'q'
- Clicking Knight calls onSelect with 'n'
- Dialog renders as overlay
- Correct piece colors shown based on promoting side

### 5. EvalBar Tests (`src/components/board/EvalBar.test.tsx`)

- Renders with 0.0 eval (50/50 split)
- Positive eval shows more white
- Negative eval shows more black
- Mate score displays "M3" format
- Clamped at ±10 (extreme evals don't break layout)
- Hidden when showEvalBar preference is false

### 6. EngineLines Tests (`src/components/board/EngineLines.test.tsx`)

- Renders top 3 lines with evaluations
- Moves displayed in SAN notation
- Loading state shown when analysis in progress
- Hidden when showEngineLines preference is false
- Clicking a line calls onLineSelect

---

## Acceptance Criteria

- [ ] Board renders correctly with various FEN positions
- [ ] Move history displays all move formats correctly
- [ ] Navigation controls enable/disable at boundaries
- [ ] Promotion dialog returns correct piece selection
- [ ] Eval bar scales correctly for all eval ranges
- [ ] Engine lines display correct data
- [ ] All tests pass with no warnings

---

## Files Created

```
src/
  components/
    board/
      ChessBoard.test.tsx
      MoveHistory.test.tsx
      BoardControls.test.tsx
      PromotionDialog.test.tsx
      EvalBar.test.tsx
      EngineLines.test.tsx
```
