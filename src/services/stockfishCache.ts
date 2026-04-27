/**
 * stockfishCache — small LRU keyed by `${fen}::${depth}` returning the
 * cached evaluation. Lets the spine and hint system skip the worker
 * entirely on repeat asks (e.g. brain re-evaluating a position the
 * board prefetch already analyzed).
 *
 * Capacity 256 entries — small enough to never matter for memory,
 * large enough to cover several minutes of play. Map iteration order
 * is insertion order, so `delete()` + `set()` on access bumps an entry
 * to MRU; we evict by deleting the first key when over capacity.
 *
 * Pure module state — no Dexie / no React. Cache survives the lifetime
 * of the page; the next page load starts fresh, which is fine.
 */
import type { StockfishAnalysis } from '../types';

const CAPACITY = 256;

const cache = new Map<string, StockfishAnalysis>();

function cacheKey(fen: string, depth: number): string {
  return `${fen}::${depth}`;
}

export const stockfishCache = {
  get(fen: string, depth: number): StockfishAnalysis | undefined {
    const key = cacheKey(fen, depth);
    const hit = cache.get(key);
    if (!hit) return undefined;
    // Bump to MRU so the next eviction targets a colder entry.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  },

  set(fen: string, depth: number, analysis: StockfishAnalysis): void {
    const key = cacheKey(fen, depth);
    if (cache.has(key)) {
      cache.delete(key);
    } else if (cache.size >= CAPACITY) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(key, analysis);
  },

  /** Number of cached entries; exposed for tests + diagnostics. */
  size(): number {
    return cache.size;
  },

  /** Drop every entry. Used by tests to isolate cases. */
  clear(): void {
    cache.clear();
  },
};
