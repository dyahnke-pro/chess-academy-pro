// PLAN #70 — the review's verdict must be a pure function of the game under
// the audit switch, and the review must never touch the live singleton when a
// pool worker can be had. Both halves are BEHAVIOURAL here (a fake Worker
// records the UCI stream), because the source-regex gates in
// `analysisDeterminism.test.ts` can only prove a budget was routed, not that
// the search that ran was reproducible.
//
// WHY THE DEPTH-ONLY SEAM WAS NOT ENOUGH (measured 2026-09-20 on bundle
// `index-BeoVsaKE`, Firouzja–Carlsen 06wNUWaA, pinned): with every budget at
// the depth-binding ceiling the pair STILL differed — ply 50 graded a 1.1
// mistake in run 1 and a 0.7 inaccuracy in run 2. Two mechanisms, neither a
// budget: (1) the curve pass hands positions to pool workers off a shared
// counter, so WHICH worker's warm hash searches a position is timing;
// (2) the sacrifice verify and best-move refine ran on the multi-thread
// singleton, whose lazy-SMP search is nondeterministic by construction.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chess } from 'chess.js';

vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  isBookLine: () => false,
}));

/** Every call the REVIEW makes to the live singleton. Must stay EMPTY while a
 *  pool worker is available — that engine belongs to the live asks. */
const singletonCalls: { fen: string; depth: number }[] = [];
vi.mock('./stockfishEngine', () => {
  const answer = (fen: string, depth: number): Promise<unknown> => {
    singletonCalls.push({ fen, depth });
    return Promise.resolve({ evaluation: 0, bestMove: 'd2d4', isMate: false, mateIn: null, depth, topLines: [], nodesPerSecond: 1 });
  };
  return {
    stockfishEngine: { initialize: vi.fn(() => Promise.resolve()), analyzePosition: vi.fn(answer), analyzeWithBudget: vi.fn(answer) },
    isIosSafari: () => false,
    resolveWorkerUrl: () => ({ url: '/stockfish/stockfish-18-lite-single.js', variant: 'single', reason: 'test', workerType: 'classic' }),
  };
});

import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';

const PGN = '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 1-0';
const FENS: string[] = (() => {
  const c = new Chess();
  c.loadPgn(PGN);
  const v = c.history({ verbose: true });
  return [v[0].before, ...v.map((m) => m.after)];
})();
/** Level, then White's 3.Bb5 (fens[4] → fens[5]) drops 320cp — one flagged ply. */
const CURVE = [20, 20, 20, 20, 20, -300, -300, -300, -300];

/** Every UCI line each fake received, in order, per worker. */
const streams: string[][] = [];
/** Make the dive's REVIEW_DEEP_DEPTH search at this fen die (the worker throws
 *  on `go`), so `deepBest` stays null and the best-move refine has to search. */
let dieOnDeepAt: string | null = null;

class FakeStockfishWorker {
  private listeners: ((e: MessageEvent<string>) => void)[] = [];
  private fen = '';
  readonly stream: string[] = [];
  onerror: (() => void) | null = null;
  constructor() { streams.push(this.stream); }
  addEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners.push(fn); }
  removeEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners = this.listeners.filter((l) => l !== fn); }
  private emit(line: string): void { for (const l of [...this.listeners]) l({ data: line } as MessageEvent<string>); }
  postMessage(msg: string): void {
    this.stream.push(msg);
    if (msg === 'isready') { setTimeout(() => this.emit('readyok'), 0); return; }
    if (msg.startsWith('position fen ')) { this.fen = msg.slice('position fen '.length); return; }
    if (msg.startsWith('go ')) {
      const depth = Number(/depth (\d+)/.exec(msg)?.[1] ?? 0);
      if (dieOnDeepAt && this.fen === dieOnDeepAt && depth === 16) throw new Error('scripted: worker died on the dive');
      const idx = FENS.indexOf(this.fen);
      // Side-to-move POV on the wire; analyzePosition flips it back to White POV.
      const white = CURVE[idx] ?? 0;
      const cp = this.fen.split(' ')[1] === 'b' ? -white : white;
      setTimeout(() => { this.emit(`info depth ${depth} score cp ${cp} pv d2d4`); this.emit('bestmove d2d4'); }, 0);
    }
  }
  terminate(): void { /* nothing to free */ }
}

/** `ucinewgame` immediately precedes every `position fen` on this stream? */
function everySearchStartsCold(stream: string[]): boolean {
  return stream.every((m, i) => !m.startsWith('position fen ') || stream[i - 1] === 'ucinewgame');
}

beforeEach(async () => {
  streams.length = 0;
  singletonCalls.length = 0;
  dieOnDeepAt = null;
  vi.stubGlobal('Worker', FakeStockfishWorker);
  await db.delete();
  await db.open();
});
afterEach(() => {
  delete (globalThis as { __auditDeterministicAnalysis?: unknown }).__auditDeterministicAnalysis;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('the pool under the audit determinism switch (PLAN #70)', () => {
  it('PRODUCT: a pool worker clears its hash once per game, never per position', async () => {
    const { __testables } = await import('./gameAnalysisService');
    const fens = Array.from({ length: 9 }, (_, i) => `${i}/8/8/8/8/8/8/K6k w - - 0 1`);
    const out = await __testables.evaluateFensPooled(fens);
    expect(out, 'the pool did not run').not.toBeNull();
    const used = streams.filter((s) => s.some((m) => m.startsWith('position fen ')));
    expect(used.length).toBeGreaterThan(0);
    for (const s of used) {
      // One clear (the `newGame()` at the top of the worker's run), then every
      // search on the warm table — the 2026-09-07 storm rule, at the pool.
      expect(s.filter((m) => m === 'ucinewgame')).toHaveLength(1);
      expect(everySearchStartsCold(s)).toBe(s.filter((m) => m.startsWith('position fen ')).length <= 1);
    }
  }, 30_000);

  it('AUDIT FLAG: every pool search starts from a cold hash, so the eval is a pure function of (fen, depth) whichever worker the queue hands it to', async () => {
    (globalThis as { __auditDeterministicAnalysis?: unknown }).__auditDeterministicAnalysis = true;
    const { __testables } = await import('./gameAnalysisService');
    const fens = Array.from({ length: 9 }, (_, i) => `${i}/8/8/8/8/8/8/K6k w - - 0 1`);
    const out = await __testables.evaluateFensPooled(fens);
    expect(out).not.toBeNull();
    const used = streams.filter((s) => s.some((m) => m.startsWith('position fen ')));
    expect(used.length).toBeGreaterThan(0);
    for (const s of used) expect(everySearchStartsCold(s), `warm search on the wire: ${s.join(' | ')}`).toBe(true);
  }, 30_000);

  it('PARITY: with a pool worker available the review never touches the live singleton — dive, sacrifice verify AND best-move refine all run on the dedicated worker', async () => {
    // Kill the dive's search at the flagged ply so the best-move refine has to
    // search on its own (the dive normally hands it its result). Before this
    // build that refine — and the sacrifice verify beside it — went to the
    // multi-thread singleton: the engine every live ask waits on, and a search
    // no determinism switch can make reproducible.
    dieOnDeepAt = FENS[4];
    const { analyzeSingleGame, BEST_MOVE_DEPTH } = await import('./gameAnalysisService');
    await db.games.put(buildGameRecord({ id: 'g-parity', pgn: PGN, annotations: [], fullyAnalyzed: false }));
    const anns = await analyzeSingleGame('g-parity');
    expect(anns).not.toBeNull();
    expect(anns![4].classification).toBe('blunder');

    const wire = streams.flat();
    const refine = wire.filter((m) => m === `go depth ${BEST_MOVE_DEPTH} movetime 8000`);
    expect(refine, 'the best-move refine did not run on a pool worker').not.toHaveLength(0);
    expect(singletonCalls, `the review reached the live singleton: ${JSON.stringify(singletonCalls)}`).toEqual([]);
  }, 30_000);
});
