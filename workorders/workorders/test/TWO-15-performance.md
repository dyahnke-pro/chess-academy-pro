# TWO-15: Performance Tests & Benchmarks

**Status:** Not Started
**Dependencies:** WO-11, WO-05, TWO-01

---

## Objective

Benchmark critical performance paths: Stockfish analysis speed, IndexedDB throughput, puzzle loading time, and bundle size.

---

## Test Suites

### 1. Stockfish Performance (`src/test/benchmarks/stockfish.bench.ts`)

Using Vitest bench mode:

- Depth 12 analysis: < 500ms
- Depth 15 analysis: < 2s
- Depth 18 analysis: < 5s
- Multiple sequential analyses: no memory leak
- Engine initialization: < 3s

### 2. IndexedDB Performance (`src/test/benchmarks/dexie.bench.ts`)

- Bulk insert 10,000 puzzles: < 2s
- Query 100 puzzles by rating range: < 100ms
- Query puzzles by theme (indexed): < 100ms
- Update SRS fields on 50 records: < 200ms
- Full database clear + reload: < 5s

### 3. Puzzle Loading Performance (`src/test/benchmarks/puzzleLoad.bench.ts`)

- Core puzzle JSON parse (10,000 records): < 500ms
- Tier 2 puzzle file fetch + parse: < 2s
- Puzzle selection algorithm (500K pool): < 100ms
- SRS queue building: < 200ms

### 4. Bundle Size Verification (`src/test/benchmarks/bundle.test.ts`)

- Initial bundle (gzipped): < 500KB
- Largest chunk: < 200KB gzipped
- Stockfish WASM not included in JS bundle
- Puzzle data not included in JS bundle
- Tree-shaking verified for Recharts and Lucide

### 5. Render Performance

- Dashboard initial render: < 200ms
- Board position change: < 50ms
- Theme switch: < 100ms (no layout shift)
- Page navigation: < 300ms

---

## Files Created

```
src/test/benchmarks/
  stockfish.bench.ts
  dexie.bench.ts
  puzzleLoad.bench.ts
  bundle.test.ts
```
