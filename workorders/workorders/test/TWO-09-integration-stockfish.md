# TWO-09: Integration Tests — Stockfish WASM

**Status:** Not Started
**Dependencies:** WO-11, TWO-01

---

## Objective

Integration tests for the Stockfish engine service. These tests verify the UCI protocol wrapper, analysis pipeline, and game annotation flow. Use the mock worker for CI; optionally test with real WASM locally.

---

## Test Suites

### 1. StockfishEngine Service Tests (`src/services/stockfishEngine.test.ts`)

**Using mock worker:**
- Engine initializes and reports ready
- `analyze()` returns valid StockfishAnalysis object
- `analyze()` returns correct bestMove, evaluation, topLines
- `getBestMove()` returns a valid UCI move string
- `evaluatePosition()` returns centipawn value
- `stop()` terminates current analysis
- Multiple rapid analyze calls: only latest result used (debounce)
- `destroy()` terminates the worker

**UCI protocol verification:**
- 'uci' command sent on init
- 'isready' sent before each analysis
- 'position fen ...' sent with correct FEN
- 'go depth N' sent with correct depth
- MultiPV setting applied correctly
- Mate scores parsed correctly ("score mate 3" → isMate: true, mateIn: 3)

### 2. Game Analysis Pipeline Tests (`src/services/stockfishEngine.test.ts`)

**analyzeGame:**
- Processes all moves in a PGN
- Progress callback fires with increasing percentages
- Each move gets a MoveAnnotation
- Classifications are correct based on centipawn loss
- Brilliant moves detected (sacrifice + eval gain)
- Book moves detected (opening phase)
- Analysis can be cancelled mid-game

### 3. Platform Detection Tests (`src/utils/platform.test.ts`)

- Mobile user agent → isMobile: true, stockfishBuild: 'lite-single'
- Desktop user agent → isDesktop: true
- SharedArrayBuffer present → supportsMultiThread: true (desktop only)
- SharedArrayBuffer absent → supportsMultiThread: false
- Recommended depth: 15 for mobile, 22 for desktop

---

## Files Created

```
src/services/stockfishEngine.test.ts
src/utils/platform.test.ts
```
