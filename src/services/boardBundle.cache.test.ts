import { describe, it, expect, vi } from 'vitest';

// Count every computer read: the cache is proven by the reads it does NOT make.
const calls = vi.hoisted(() => ({ n: 0 }));
vi.mock('./boardComputers', async (importOriginal) => {
  const real = await importOriginal<typeof import('./boardComputers')>();
  return { ...real, readBoardAll: ((id: never, ctx: never) => { calls.n += 1; return real.readBoardAll(id, ctx); }) as typeof real.readBoardAll };
});

import { readEveryComputer, bundleKey, type BoardBundle } from './boardBundle';
import { whatChanged, futureBoards, bundleAt } from './futures';

const FEN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
function bundle(): BoardBundle {
  return { fen: FEN, student: 'w', lines: [{ moves: ['c2c3', 'g8f6', 'd2d4'], cp: 30, mate: null }], rating: 1400, history: [], priorMove: null, priorMoveSeat: null, priorLines: null };
}

describe('readEveryComputer — a board read once is read', () => {
  it('a bundle built apart with the same values reads no computer again, and gives the same facts', () => {
    calls.n = 0;
    const first = readEveryComputer(bundle());
    const fresh = calls.n;
    expect(fresh).toBeGreaterThan(0);
    const again = readEveryComputer(bundle());
    expect(calls.n).toBe(fresh);
    expect(again).toEqual(first);
    // The caller's array is its own: changing it never changes the next read.
    again.length = 0;
    expect(readEveryComputer(bundle())).toEqual(first);
  });

  it('a bundle that differs in any field is a different read', () => {
    const base = bundle();
    const other = { ...base, rating: 2000 };
    expect(bundleKey(other)).not.toBe(bundleKey(base));
    expect(bundleKey({ ...base, seconds: [['g8f6']] })).not.toBe(bundleKey(base));
    calls.n = 0;
    readEveryComputer(other);
    expect(calls.n).toBeGreaterThan(0);
  });

  it('whatChanged reads the best line\'s boards once, for every try weighed against it', () => {
    const best = { moves: ['c2c3', 'g8f6', 'd2d4', 'e5d4', 'c3d4'], cp: 30, mate: null };
    const tryLine = { moves: ['d2d3', 'g8f6', 'c2c3', 'd7d6', 'b1d2'], cp: 10, mate: null };
    whatChanged({ fen: FEN, student: 'w', rating: 1400, tryLine, bestLine: best });
    // The best line's boards, built again as the next try's whatChanged builds them: already read.
    const f = futureBoards(FEN, best.moves);
    calls.n = 0;
    for (const at of [f.reply, f.quiet]) if (at) readEveryComputer(bundleAt(at, best, 'w', 1400));
    expect(f.reply && f.quiet).toBeTruthy();
    expect(calls.n).toBe(0);
  });
});
