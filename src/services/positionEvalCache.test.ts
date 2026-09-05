import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  evalCacheKey,
  lookupPositionEvals,
  storePositionEvals,
  prunePositionEvalCache,
  EVAL_CACHE_MAX_ROWS,
  EVAL_CACHE_PRUNE_TO,
} from './positionEvalCache';

// The eval cache is what lets a repeated position skip the engine (David
// 2026-09-05, "how does chess.com analyze so fast?"). The load-bearing
// properties: the key ignores move counters, a lookup never serves a shallower
// eval than asked for, and a write never downgrades a deeper row.

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('positionEvalCache', () => {
  it('keys on the 4-field FEN so move counters never split the cache', () => {
    expect(evalCacheKey('8/8/8/4k3/8/8/4K3/6R1 w - - 12 57')).toBe('8/8/8/4k3/8/8/4K3/6R1 w - -');
    expect(evalCacheKey('8/8/8/4k3/8/8/4K3/6R1 w - - 0 1')).toBe(evalCacheKey('8/8/8/4k3/8/8/4K3/6R1 w - - 99 120'));
  });

  it('serves a cached eval by input index, and only at or above the asked depth', async () => {
    await storePositionEvals([
      { fen: START, evaluation: 20, depth: 16 },
      { fen: AFTER_E4, evaluation: 25, depth: 10 },
    ]);
    const deep = await lookupPositionEvals([START, AFTER_E4, '8/8/8/4k3/8/8/4K3/6R1 w - - 0 1'], 16);
    expect(deep.get(0)).toMatchObject({ evaluation: 20, depth: 16 });
    expect(deep.has(1)).toBe(false); // depth 10 must NOT satisfy a depth-16 review
    expect(deep.has(2)).toBe(false); // never searched
    const shallow = await lookupPositionEvals([AFTER_E4], 10);
    expect(shallow.get(0)?.evaluation).toBe(25);
  });

  it('a lookup with different move counters still hits', async () => {
    await storePositionEvals([{ fen: START, evaluation: 20, depth: 16 }]);
    const hits = await lookupPositionEvals(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 5 40'], 16);
    expect(hits.get(0)?.evaluation).toBe(20);
  });

  it('is depth-monotonic: deeper replaces, shallower never downgrades', async () => {
    await storePositionEvals([{ fen: START, evaluation: 20, depth: 16, bestMove: 'e2e4' }]);
    const downgraded = await storePositionEvals([{ fen: START, evaluation: 999, depth: 10 }]);
    expect(downgraded).toBe(0);
    expect((await lookupPositionEvals([START], 1)).get(0)).toMatchObject({ evaluation: 20, depth: 16, bestMove: 'e2e4' });

    const upgraded = await storePositionEvals([{ fen: START, evaluation: 31, depth: 18 }]);
    expect(upgraded).toBe(1);
    // A deeper search that carried no best move invalidates the shallower one's.
    expect((await lookupPositionEvals([START], 1)).get(0)).toMatchObject({ evaluation: 31, depth: 18, bestMove: null });
  });

  it('an equal-depth write only ever ADDS a best move', async () => {
    await storePositionEvals([{ fen: START, evaluation: 20, depth: 16 }]);
    expect(await storePositionEvals([{ fen: START, evaluation: 20, depth: 16 }])).toBe(0);
    expect(await storePositionEvals([{ fen: START, evaluation: 22, depth: 16, bestMove: 'd2d4' }])).toBe(1);
    expect((await lookupPositionEvals([START], 16)).get(0)?.bestMove).toBe('d2d4');
  });

  it('drops non-finite / zero-depth junk instead of caching it', async () => {
    const n = await storePositionEvals([
      { fen: START, evaluation: Number.NaN, depth: 16 },
      { fen: AFTER_E4, evaluation: 10, depth: 0 },
    ]);
    expect(n).toBe(0);
    expect(await db.positionEvals.count()).toBe(0);
  });

  it('prunes oldest-first once the store passes its ceiling', async () => {
    // Same trim, small bounds — the production ceiling is 60k rows, which fake
    // IndexedDB cannot write inside a test budget.
    const MAX = 30;
    const TO = 20;
    const rows = Array.from({ length: MAX + 10 }, (_, i) => ({
      fen: `k7/8/8/8/8/8/8/K${i} w - -`, evaluation: 0, depth: 16, bestMove: null, updatedAt: i,
    }));
    await db.positionEvals.bulkPut(rows);
    const deleted = await prunePositionEvalCache(MAX, TO);
    expect(deleted).toBe(MAX + 10 - TO);
    expect(await db.positionEvals.count()).toBe(TO);
    // The OLDEST rows went; the newest survived.
    expect(await db.positionEvals.get('k7/8/8/8/8/8/8/K0 w - -')).toBeUndefined();
    expect(await db.positionEvals.get(`k7/8/8/8/8/8/8/K${MAX + 9} w - -`)).toBeDefined();
  });

  it('does nothing below the ceiling, and the production bounds are sane', async () => {
    await storePositionEvals([{ fen: START, evaluation: 20, depth: 16 }]);
    expect(await prunePositionEvalCache()).toBe(0);
    expect(EVAL_CACHE_PRUNE_TO).toBeLessThan(EVAL_CACHE_MAX_ROWS);
  });
});
