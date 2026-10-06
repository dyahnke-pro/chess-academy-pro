// "Stop calculations and answer the question" (David 2026-09-24): while a
// question holds the live engine, background analyses wait; the hold always
// releases, even when the question's work throws.
import { describe, it, expect } from 'vitest';
import { stockfishEngine } from './stockfishEngine';
import { stockfishCache } from './stockfishCache';

describe('stockfishEngine.holdForQuestion', () => {
  it('a background read arriving during the hold waits until the answer is done', async () => {
    const fen = '8/8/8/4k3/8/8/8/4K3 w - - 0 1';
    const order: string[] = [];
    let finishQuestion!: () => void;
    const question = stockfishEngine.holdForQuestion(async () => {
      order.push('question-start');
      await new Promise<void>((r) => { finishQuestion = r; });
      order.push('question-end');
      return 'answer';
    });
    expect(stockfishEngine.isHeldForQuestion()).toBe(true);
    // A cache hit returns at once, so seed one: what matters is that a MISS
    // waits — prove it with a read that cannot hit the cache.
    stockfishCache.set(fen, 1, { bestMove: 'e1e2', evaluation: 0, isMate: false, mateIn: null, depth: 1, topLines: [], nodesPerSecond: 0 });
    const hit = await stockfishEngine.analyzePosition(fen, 1);
    order.push(`cache-hit:${hit.bestMove}`);
    let background = false;
    const bg = stockfishEngine.analyzePosition(fen, 7).then(() => { background = true; }, () => { background = true; });
    await new Promise((r) => setTimeout(r, 30));
    expect(background).toBe(false);               // held
    finishQuestion();
    expect(await question).toBe('answer');
    expect(stockfishEngine.isHeldForQuestion()).toBe(false);
    expect(order).toEqual(['question-start', 'cache-hit:e1e2', 'question-end']);
    void bg;
  });

  it('the hold releases even when the question throws', async () => {
    await expect(stockfishEngine.holdForQuestion(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(stockfishEngine.isHeldForQuestion()).toBe(false);
  });
});

describe('stockfishEngine.holdForQuestion — the question skips the line', () => {
  it('the engine handed to the question bypasses the hold (it does not wait on itself)', async () => {
    const fen = '8/8/8/4k3/8/8/8/3K4 w - - 0 1';
    stockfishCache.set(fen, 3, { bestMove: 'd1e2', evaluation: 0, isMate: false, mateIn: null, depth: 3, topLines: [], nodesPerSecond: 0 });
    const got = await stockfishEngine.holdForQuestion((engine) => engine.analyzePosition(fen, 3));
    expect(got.bestMove).toBe('d1e2');
    expect(stockfishEngine.isHeldForQuestion()).toBe(false);
  });
});

describe('stockfishEngine.holdForQuestion — never joins a search parked on its own hold', () => {
  it('the question\'s read of a position a background read is waiting on runs its own search', async () => {
    const { vi } = await import('vitest');
    const fen = '8/8/8/4k3/8/8/2K5/8 w - - 0 1';
    const result = { bestMove: 'c2d3', evaluation: 0, isMate: false, mateIn: null, depth: 9, topLines: [], nodesPerSecond: 0 };
    const engineAny = stockfishEngine as unknown as { _dispatchAnalysis: (...a: unknown[]) => Promise<typeof result> };
    const spy = vi.spyOn(engineAny, '_dispatchAnalysis').mockResolvedValue(result);
    try {
      let bgDone = false;
      const answer = stockfishEngine.holdForQuestion(async (engine) => {
        // The game's own read of this position arrives during the hold and parks.
        const bg = stockfishEngine.analyzePosition(fen, 9).then(() => { bgDone = true; });
        await new Promise((r) => setTimeout(r, 10));
        // The question asks the SAME position: it must not wait on the parked read.
        const got = await Promise.race([
          engine.analyzePosition(fen, 9),
          new Promise<null>((r) => setTimeout(() => r(null), 500)),
        ]);
        void bg;
        return got;
      });
      const got = await answer;
      expect(got?.bestMove).toBe('c2d3');
      await new Promise((r) => setTimeout(r, 10));
      expect(bgDone).toBe(true); // the parked read runs once the hold lifts
    } finally {
      spy.mockRestore();
    }
  });
});
