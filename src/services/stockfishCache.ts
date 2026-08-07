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

/** Analyses that have STARTED but not finished, keyed the same way.
 *
 *  The completed-only cache above had a hole David's 2026-08-07 log made
 *  expensive: two callers asking for the same `(fen, depth)` while one was
 *  already running BOTH missed, because nothing is written until the search
 *  finishes — and the brain mutex serializes them, so the second paid the
 *  first's search time over again on the single worker, queued ahead of the
 *  narration's own engine read. His log carries 9 such duplicate pairs
 *  against 43 misses. A second asker now awaits the first's promise. */
const inflight = new Map<string, Promise<StockfishAnalysis>>();

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

  /** The promise of an analysis already running for this exact
   *  `(fen, depth)`, or undefined when nothing is in flight. */
  inflight(fen: string, depth: number): Promise<StockfishAnalysis> | undefined {
    return inflight.get(cacheKey(fen, depth));
  },

  /** Register a running analysis so concurrent askers can share it, and
   *  deregister it on settle (success OR failure — a failed search must
   *  not leave a poisoned promise that every later asker inherits). The
   *  promise is returned unchanged so callers can `return` it directly. */
  trackInflight(fen: string, depth: number, run: Promise<StockfishAnalysis>): Promise<StockfishAnalysis> {
    const key = cacheKey(fen, depth);
    inflight.set(key, run);
    void run
      .catch(() => undefined)
      .finally(() => {
        // Only clear OUR entry — a later analysis of the same position may
        // already have claimed the key.
        if (inflight.get(key) === run) inflight.delete(key);
      });
    return run;
  },

  /** Number of cached entries; exposed for tests + diagnostics. */
  size(): number {
    return cache.size;
  },

  /** Number of analyses currently in flight; for tests + diagnostics. */
  inflightSize(): number {
    return inflight.size;
  },

  /** Drop every entry. Used by tests to isolate cases. */
  clear(): void {
    cache.clear();
    inflight.clear();
  },
};
