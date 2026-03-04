# TWO-02: Unit Tests — Chess Logic & SRS Algorithm

**Status:** Not Started
**Dependencies:** WO-02, WO-05, TWO-01
**Estimated Scope:** chess.js integration tests, SM-2 algorithm tests, adaptive difficulty tests

---

## Objective

Write comprehensive unit tests for the chess game logic (via chess.js), the SM-2 spaced repetition algorithm, and the adaptive puzzle difficulty engine.

---

## Test Suites

### 1. SRS Engine Tests (`src/services/srsEngine.test.ts`)

**calculateNextReview:**
- Grade 0 (Again): interval resets to 1, repetitions to 0
- Grade 1 (Hard fail): interval resets to 1, repetitions to 0
- Grade 2 (Hard pass): interval resets to 1, repetitions to 0
- Grade 3 (Good): first review → interval 1, second → 6, third → 6 * easeFactor
- Grade 4 (Good easy): similar to grade 3 but ease factor increases more
- Grade 5 (Easy): interval increases with multiplier
- Ease factor never drops below 1.3
- Ease factor increases with consistent grade 5 answers
- Ease factor decreases with grade 3 answers
- After a reset (grade < 3), next correct answer starts at interval 1 again
- Interval rounding: verify intervals are rounded to nearest integer

**getButtonPreview:**
- Returns 4 interval strings for Again/Hard/Good/Easy
- Preview values match what calculateNextReview would produce
- Handles new cards (0 repetitions) correctly
- Handles mature cards (high interval) correctly

**isCardDue:**
- Returns true if due date is today or in the past
- Returns false if due date is in the future
- Handles timezone edge cases (ISO date comparison)

### 2. Chess Game Logic Tests (`src/hooks/useChessGame.test.ts`)

**Move validation:**
- Legal moves are accepted
- Illegal moves are rejected (moving into check, blocked paths, wrong turn)
- En passant works correctly
- Castling: kingside and queenside, blocked by check/pieces/moved pieces
- Pawn promotion triggers
- Check detection
- Checkmate detection
- Stalemate detection
- Fifty-move draw detection
- Threefold repetition detection

**Game navigation:**
- goToMove navigates to correct position
- goForward/goBack work at boundaries (start/end of game)
- History maintains correct move sequence
- Loading FEN sets position correctly
- Loading PGN replays all moves

**Move classification (for Stockfish integration prep):**
- Centipawn loss → classification mapping
- 0-0.3 cp loss = good
- 0.3-1.0 cp loss = inaccuracy
- 1.0-2.0 cp loss = mistake
- >2.0 cp loss = blunder

### 3. Puzzle Service Tests (`src/services/puzzleService.test.ts`)

**updatePuzzleRating:**
- Correct solve of harder puzzle: large rating increase
- Correct solve of easier puzzle: small rating increase
- Incorrect on harder puzzle: small rating decrease
- Incorrect on easier puzzle: large rating decrease
- Rating change magnitude bounded by K-factor (32)
- Initial rating (1420) adjusts in both directions

**selectPuzzles:**
- Returns correct count of puzzles
- Puzzles are within rating band (±200)
- Weakest themes are prioritized (60% weight)
- SRS-due puzzles appear first
- Excluded IDs are not returned
- Empty database returns empty array

**buildDailyQueue:**
- Includes SRS-due puzzles
- Fills remaining with adaptive selection
- Respects theme weighting
- Queue size is reasonable (20-30 puzzles)

### 4. Puzzle Theme Mapping Tests (`src/utils/puzzleThemes.test.ts`)

**categorizeByTheme:**
- 'fork' maps to 'Forks'
- 'pin' and 'skewer' both map to 'Pins & Skewers'
- Multiple Lichess tags produce multiple app themes
- Unknown tags are ignored
- Empty input returns empty output
- All 10 app themes have at least one Lichess tag mapping

### 5. Opening Detector Tests (`src/utils/openingDetector.test.ts`)

**detectOpening:**
- 1.e4 e5 2.Nc3 → "Vienna Game" (C25)
- 1.e4 c5 → "Sicilian Defence" (B20)
- Full Najdorf move order → "Sicilian Najdorf" (B90)
- Transpositions detected correctly
- Unknown move sequences return null
- Empty PGN returns null

---

## Acceptance Criteria

- [ ] All SM-2 algorithm edge cases covered (grades 0-5, new/mature cards)
- [ ] Chess move validation tests cover all special moves
- [ ] Game navigation tests verify boundary conditions
- [ ] Puzzle rating adjustment tests verify ELO formula
- [ ] Puzzle selection tests verify weighting algorithm
- [ ] Theme mapping tests cover all 10 themes
- [ ] Opening detection tests cover repertoire openings
- [ ] All tests pass
- [ ] Coverage > 90% for srsEngine.ts, puzzleService.ts, puzzleThemes.ts

---

## Files Created

```
src/
  services/
    srsEngine.test.ts
    puzzleService.test.ts
  hooks/
    useChessGame.test.ts
  utils/
    puzzleThemes.test.ts
    openingDetector.test.ts
```
