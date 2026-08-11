import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
    expect(stockfishCache.size()).toBe(2);
    // Each depth keeps its OWN result — the deeper-answers-shallower rule
    // added below is a fallback for a MISS, never an overwrite of a hit.
    expect(stockfishCache.get(STARTING, 12)?.bestMove).toBe('e2e4');
    expect(stockfishCache.get(STARTING, 18)?.bestMove).toBe('d2d4');
  });

  // 🔒 THESE VARY THE POSITION, NOT THE DEPTH. Both filled the cache with one
  // FEN at 256 different depths — a convenient way to mint unique keys back
  // when the depth was just part of a string. It is not any more: a miss now
  // falls back to a DEEPER entry for the same position, so an evicted depth-0
  // ask found depth 1 and the eviction assertion failed for a reason that had
  // nothing to do with eviction. A test for the LRU should not be able to
  // fail because of a rule about depths.
  const posAt = (i: number): string => `${'8/'.repeat(7)}${i % 8 === 0 ? 'K6k' : 'K5k1'} w - - ${i} ${i + 1}`;

  it('LRU evicts the oldest entry when capacity is exceeded', () => {
    for (let i = 0; i < 256; i++) {
      stockfishCache.set(posAt(i), 18, buildAnalysis(`m${i}`, 18));
    }
    expect(stockfishCache.size()).toBe(256);

    // Insert one more — the first inserted should evict. Don't `get` before
    // this point or we'd bump entries to MRU and change which one is oldest.
    stockfishCache.set(E4, 18, buildAnalysis('e7e5', 18));
    expect(stockfishCache.size()).toBe(256);
    expect(stockfishCache.get(posAt(0), 18)).toBeUndefined();
    expect(stockfishCache.get(posAt(1), 18)?.bestMove).toBe('m1');
    expect(stockfishCache.get(E4, 18)?.bestMove).toBe('e7e5');
  });

  it('access bumps an entry to MRU so it survives eviction', () => {
    stockfishCache.set(posAt(1), 18, buildAnalysis('m1', 18));
    for (let i = 2; i < 257; i++) {
      stockfishCache.set(posAt(i), 18, buildAnalysis(`m${i}`, 18));
    }
    // Touch the first one right before the eviction wave; it is now MRU.
    stockfishCache.get(posAt(1), 18);
    stockfishCache.set(E4, 99, buildAnalysis('e7e5', 99));
    expect(stockfishCache.get(posAt(1), 18)?.bestMove).toBe('m1');
    expect(stockfishCache.get(posAt(2), 18)).toBeUndefined();
  });

  it('overwriting an existing key keeps capacity steady and replaces the value', () => {
    stockfishCache.set(STARTING, 18, buildAnalysis('e2e4', 18));
    stockfishCache.set(STARTING, 18, buildAnalysis('d2d4', 18));
    expect(stockfishCache.size()).toBe(1);
    expect(stockfishCache.get(STARTING, 18)?.bestMove).toBe('d2d4');
  });

  describe('in-flight coalescing', () => {
    it('hands a concurrent asker the SAME promise instead of a second search', async () => {
      let resolve!: (a: ReturnType<typeof buildAnalysis>) => void;
      const search = new Promise<ReturnType<typeof buildAnalysis>>((r) => { resolve = r; });
      const tracked = stockfishCache.trackInflight(STARTING, 18, search);

      // A second asker for the same (fen, depth) sees the running search.
      expect(stockfishCache.inflight(STARTING, 18)).toBe(tracked);
      // A SHALLOWER ask now rides the running deeper search rather than
      // starting a second one beside it on the single worker (see the
      // deeper-answers-shallower cases below). A DEEPER ask still does not.
      expect(stockfishCache.inflight(STARTING, 12)).toBe(tracked);
      expect(stockfishCache.inflight(STARTING, 20)).toBeUndefined();
      expect(stockfishCache.inflight(E4, 18)).toBeUndefined();

      resolve(buildAnalysis('e2e4', 18));
      expect((await tracked).bestMove).toBe('e2e4');
    });

    it('deregisters on settle so a later asker is not served a stale promise', async () => {
      const tracked = stockfishCache.trackInflight(STARTING, 18, Promise.resolve(buildAnalysis('e2e4', 18)));
      await tracked;
      await Promise.resolve();
      expect(stockfishCache.inflight(STARTING, 18)).toBeUndefined();
      expect(stockfishCache.inflightSize()).toBe(0);
    });

    it('a FAILED search does not poison the key — the next asker starts fresh', async () => {
      const failing = stockfishCache.trackInflight(STARTING, 18, Promise.reject(new Error('worker died')));
      await expect(failing).rejects.toThrow('worker died');
      await Promise.resolve();
      expect(stockfishCache.inflight(STARTING, 18)).toBeUndefined();
    });

    it('clear() drops in-flight entries too', () => {
      void stockfishCache.trackInflight(STARTING, 18, new Promise(() => undefined));
      expect(stockfishCache.inflightSize()).toBe(1);
      stockfishCache.clear();
      expect(stockfishCache.inflightSize()).toBe(0);
    });
  });
});

// A DEEPER ANSWER ALREADY ANSWERS A SHALLOWER QUESTION.
//
// Measured on David's game review of 2026-08-11: 80 cache misses against 4
// hits, running in depth-12/depth-14 pairs over the SAME positions, two and a
// half minutes of engine time for a game that had already been analysed. The
// key was `${fen}::${depth}` and nothing else, so an ask for depth 12 missed
// even with depth 14 for that identical board sitting in the map.
describe('a deeper result serves a shallower ask', () => {
  const FEN = 'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const analysis = (depth: number): StockfishAnalysis => ({
    bestMove: 'd2d4', evaluation: 30, isMate: false, mateIn: null,
    depth, topLines: [], nodesPerSecond: 0,
  });

  beforeEach(() => { stockfishCache.clear(); });

  it('answers a depth-12 ask from a cached depth-14 search', () => {
    stockfishCache.set(FEN, 14, analysis(14));
    expect(stockfishCache.get(FEN, 12)?.depth).toBe(14);
  });

  it('never answers a depth-14 ask from a shallower search', () => {
    // The rule is one-directional on purpose: a depth-12 result did not look
    // as far and cannot stand in for the deeper question.
    stockfishCache.set(FEN, 12, analysis(12));
    expect(stockfishCache.get(FEN, 14)).toBeUndefined();
  });

  it('prefers the exact depth when it has one', () => {
    stockfishCache.set(FEN, 12, analysis(12));
    stockfishCache.set(FEN, 18, analysis(18));
    expect(stockfishCache.get(FEN, 12)?.depth).toBe(12);
  });

  it('does not borrow another position\'s answer', () => {
    stockfishCache.set(FEN, 20, analysis(20));
    expect(stockfishCache.get('8/8/8/8/8/8/8/K6k w - - 0 1', 12)).toBeUndefined();
  });

  // This is where the review's paired asks actually collide: the two depths
  // are requested moments apart, so the deeper one is usually still in flight
  // rather than already cached — and the single worker would otherwise run
  // both, one behind the other.
  it('waits on a deeper search already running instead of starting a second', async () => {
    const run = Promise.resolve(analysis(14));
    const tracked = stockfishCache.trackInflight(FEN, 14, run);
    expect(stockfishCache.inflight(FEN, 12)).toBe(tracked);
    expect(stockfishCache.inflight(FEN, 16), 'a deeper ask must not ride a shallower search').toBeUndefined();
    await tracked; // settle so the entry deregisters before the next case
  });
});
