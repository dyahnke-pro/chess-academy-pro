import type { StockfishAnalysis } from '../types';

/**
 * Shared per-FEN Stockfish cache for narration hooks. When the same
 * FEN is narrated twice within a single session — common when the
 * student re-reads a tense middlegame, or when a phase transition
 * lands on a position the student just asked about — the second
 * caller skips the engine cycle and uses the cached analysis.
 *
 * Bounded to `MAX_ENTRIES` (LRU via delete-then-set) so a long game
 * doesn't grow memory unboundedly. Used by `usePositionNarration`
 * (Read this position) and `usePhaseNarration` (transition narration)
 * so a cache populated by either hook benefits the other.
 *
 * Extracted from `usePositionNarration.ts` by WO-PHASE-LAG-02.
 */

const MAX_ENTRIES = 16;
const cache = new Map<string, StockfishAnalysis>();

/** Look up a cached analysis. Returns undefined on miss. */
export function getCachedStockfish(fen: string): StockfishAnalysis | undefined {
  return cache.get(fen);
}

/** Store an analysis, bumping it to most-recently-used. Evicts the
 *  oldest entry when capacity is exceeded. */
export function setCachedStockfish(fen: string, analysis: StockfishAnalysis): void {
  cache.delete(fen);
  cache.set(fen, analysis);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Test-only: wipe the cache between test cases. Callers use
 *  `__resetStockfishFenCacheForTests` (the leading underscores
 *  signal it's not a production API). */
export function __resetStockfishFenCacheForTests(): void {
  cache.clear();
}
