import { afterEach, describe, expect, it } from 'vitest';
import { stockfishCache } from './stockfishCache';
import type { StockfishAnalysis } from '../types';

function buildAnalysis(bestMove: string, depth: number): StockfishAnalysis {
  return {
    bestMove,
    evaluation: 0,
    isMate: false,
    mateIn: null,
    depth,
    topLines: [],
    nodesPerSecond: 0,
  };
}

const STARTING = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('stockfishCache', () => {
  afterEach(() => {
    stockfishCache.clear();
  });

  it('hit returns the cached analysis', () => {
    const analysis = buildAnalysis('e2e4', 18);
    stockfishCache.set(STARTING, 18, analysis);
    const hit = stockfishCache.get(STARTING, 18);
    expect(hit).toBe(analysis);
  });

  it('miss returns undefined and does not invent values', () => {
    expect(stockfishCache.get(STARTING, 18)).toBeUndefined();
  });

  it('keys by depth — same FEN at different depths is two entries', () => {
    stockfishCache.set(STARTING, 12, buildAnalysis('e2e4', 12));
    stockfishCache.set(STARTING, 18, buildAnalysis('d2d4', 18));
    expect(stockfishCache.get(STARTING, 12)?.bestMove).toBe('e2e4');
    expect(stockfishCache.get(STARTING, 18)?.bestMove).toBe('d2d4');
  });

  it('LRU evicts the oldest entry when capacity is exceeded', () => {
    // Fill to capacity (256). Use depth as a counter to vary keys.
    for (let i = 0; i < 256; i++) {
      stockfishCache.set(STARTING, i, buildAnalysis(`m${i}`, i));
    }
    expect(stockfishCache.size()).toBe(256);

    // Insert one more — depth=0 (the first inserted) should evict.
    // Don't `get` before this point or we'd bump entries to MRU and
    // change which one is oldest.
    stockfishCache.set(E4, 18, buildAnalysis('e7e5', 18));
    expect(stockfishCache.size()).toBe(256);
    expect(stockfishCache.get(STARTING, 0)).toBeUndefined();
    expect(stockfishCache.get(STARTING, 1)?.bestMove).toBe('m1');
    expect(stockfishCache.get(E4, 18)?.bestMove).toBe('e7e5');
  });

  it('access bumps an entry to MRU so it survives eviction', () => {
    stockfishCache.set(STARTING, 1, buildAnalysis('m1', 1));
    for (let i = 2; i < 257; i++) {
      stockfishCache.set(STARTING, i, buildAnalysis(`m${i}`, i));
    }
    // Touch depth=1 right before the eviction wave; it should now be MRU.
    stockfishCache.get(STARTING, 1);
    // Add one more entry beyond capacity. depth=2 should evict (it's now
    // the oldest) — depth=1 must still be present.
    stockfishCache.set(E4, 99, buildAnalysis('e7e5', 99));
    expect(stockfishCache.get(STARTING, 1)?.bestMove).toBe('m1');
    expect(stockfishCache.get(STARTING, 2)).toBeUndefined();
  });

  it('overwriting an existing key keeps capacity steady and replaces the value', () => {
    stockfishCache.set(STARTING, 18, buildAnalysis('e2e4', 18));
    stockfishCache.set(STARTING, 18, buildAnalysis('d2d4', 18));
    expect(stockfishCache.size()).toBe(1);
    expect(stockfishCache.get(STARTING, 18)?.bestMove).toBe('d2d4');
  });
});
