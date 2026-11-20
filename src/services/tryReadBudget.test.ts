import { describe, it, expect } from 'vitest';
import { TRY_READ_BUDGET, tryReadBudget, poolBudgetMs, poolDispatcher, type TrySource, type ReadSurface, type ReadBudget } from './tryReadBudget';
import { surfaceBoardReader } from './positionReadComposer';
import type { StockfishAnalysis } from '../types';
import tries from './__fixtures__/danyaTries.reads.json';

/** Every source a try can come from (the eye, the plan, each reason try, their reply, the best move's board). */
const SOURCES: TrySource[] = ['eye', 'plan', 'capture', 'check', 'passer', 'king', 'threat', 'defence', 'mate-threat', 'lever', 'double', 'reroute', 'their-eye', 'best-after', 'future'];
const SURFACES: ReadSurface[] = ['learn', 'play', 'openings', 'puzzle', 'review'];

function analysis(fen: string, depth: number): StockfishAnalysis {
  return { bestMove: 'e2e4', evaluation: 10, isMate: false, mateIn: null, depth, nodesPerSecond: 0,
    topLines: [{ rank: 1, evaluation: 10, mate: null, moves: [fen.slice(0, 4)], depth }] };
}

describe('tryReadBudget — the engine budget per surface, by source', () => {
  it('every surface budgets every source (no source is cut by a count)', () => {
    for (const s of SURFACES) {
      const b = tryReadBudget(s);
      expect(Object.keys(b.reads).sort()).toEqual([...SOURCES].sort());
      for (const src of SOURCES) {
        expect(b.reads[src].depth).toBeGreaterThan(0);
        expect(b.reads[src].budgetMs).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(TRY_READ_BUDGET).sort()).toEqual([...SURFACES].sort());
  });

  it('Learn reads its tries shallow and on the pool; Review reads the tempting ones deeper', () => {
    const learn = tryReadBudget('learn');
    const review = tryReadBudget('review');
    expect(learn.pool).toBe(true);
    for (const src of ['eye', 'plan', 'capture', 'reroute'] as const) {
      expect(review.reads[src].depth).toBeGreaterThanOrEqual(18);
      expect(review.reads[src].depth).toBeGreaterThan(learn.reads[src].depth);
    }
    // Their replies are not tempting tries: Review reads them at its ordinary depth.
    expect(review.reads['their-eye'].depth).toBeLessThan(review.reads.eye.depth);
    expect(poolBudgetMs('review')).toBe(review.reads.eye.budgetMs);
  });
});

describe('his tries are read deep in Review (the stored depth-14 reads of Naroditsky\'s ?/?! tries)', () => {
  it('every try of his the board read weighs comes from a tempting source, read at depth 18+ in Review and live in Learn', async () => {
    const { Chess } = await import('chess.js');
    const { candidateMoves } = await import('./weighedMoves');
    const { consideredTries } = await import('./tryCandidates');
    const rows = tries as Array<{ fen: string; try: string }>;
    const review = tryReadBudget('review').reads;
    const learn = tryReadBudget('learn').reads;
    let weighed = 0;
    for (const r of rows) {
      let uci: string;
      try { const m = new Chess(r.fen).move(r.try); uci = m.from + m.to + (m.promotion ?? ''); } catch { continue; }
      const source: TrySource | null = candidateMoves(r.fen, 1800, { played: null, scored: null }).some((c) => c.uci === uci)
        ? 'eye' : consideredTries(r.fen).get(uci)?.why ?? null;
      if (!source) continue;
      weighed += 1;
      expect(review[source].depth, `${r.try} (${source})`).toBeGreaterThanOrEqual(18);
      expect(learn[source].depth).toBe(12);
    }
    expect(weighed).toBeGreaterThan(rows.length / 2);
  }, 120_000);
});

describe('poolDispatcher — N reads on K engines cost about N/K searches', () => {
  it('spreads reads over every engine and runs them side by side, one search per engine at a time', async () => {
    let live = 0;
    let peak = 0;
    const perEngine = [0, 0, 0];
    const busy = [false, false, false];
    const engines = [0, 1, 2].map((k) => ({
      read: async (fen: string, _b: ReadBudget) => {
        expect(busy[k]).toBe(false); // a worker never runs two searches at once
        busy[k] = true; live += 1; peak = Math.max(peak, live); perEngine[k] += 1;
        await new Promise((r) => setTimeout(r, 5));
        busy[k] = false; live -= 1;
        return analysis(fen, 12).topLines;
      },
    }));
    const read = poolDispatcher(engines);
    const fens = Array.from({ length: 9 }, (_, i) => `fen${i} w`);
    const out = await Promise.all(fens.map((f) => read(f, { depth: 12, budgetMs: 300 })));
    expect(out.map((l) => l?.[0].moves[0])).toEqual(fens.map((f) => f.slice(0, 4)));
    expect(peak).toBe(3);
    expect(perEngine).toEqual([3, 3, 3]);
  });
});

describe('surfaceBoardReader — the tries on the pool, the best move\'s board on the singleton', () => {
  it('reads a try on the pool at the surface\'s depth, the board after the best move on the singleton', async () => {
    const pooled: Array<[string, number, number | undefined]> = [];
    const single: Array<[string, number, number]> = [];
    let released = 0;
    const r = await surfaceBoardReader('review', true,
      async () => ({ engines: [{ analyzeDeep: async (fen, depth, budgetMs) => { pooled.push([fen, depth, budgetMs]); return analysis(fen, depth); } }], release: () => { released += 1; } }),
      async (fen, depth, budgetMs) => { single.push([fen, depth, budgetMs]); return analysis(fen, depth); });
    await r.read('try-board w', 'eye');
    await r.read('reply-board w', 'their-eye');
    await r.read('best-board w', 'best-after');
    r.release();
    const rv = tryReadBudget('review').reads;
    expect(pooled).toEqual([['try-board w', rv.eye.depth, rv.eye.budgetMs], ['reply-board w', rv['their-eye'].depth, rv['their-eye'].budgetMs]]);
    expect(single).toEqual([['best-board w', rv['best-after'].depth, rv['best-after'].budgetMs]]);
    expect(released).toBe(1);
  });

  it('a second read of the same board (a second tap) asks the engine nothing and answers the same', async () => {
    let calls = 0;
    const single = async (fen: string, depth: number): Promise<StockfishAnalysis> => { calls += 1; return analysis(fen, depth); };
    const first = await surfaceBoardReader('learn', false, async () => null, single);
    const a = await first.read('cache-board w', 'eye');
    const second = await surfaceBoardReader('learn', false, async () => null, single);
    const b = await second.read('cache-board w', 'eye');
    expect(calls).toBe(1);
    expect(b).toEqual(a);
    // A deeper budget is another read.
    const review = await surfaceBoardReader('review', false, async () => null, single);
    await review.read('cache-board w', 'eye');
    expect(calls).toBe(2);
    // An empty read is not kept: the next tap asks again.
    let empties = 0;
    const empty = async (fen: string): Promise<StockfishAnalysis> => { empties += 1; return { ...analysis(fen, 12), topLines: [] }; };
    await (await surfaceBoardReader('learn', false, async () => null, empty)).read('empty-board w', 'eye');
    await (await surfaceBoardReader('learn', false, async () => null, empty)).read('empty-board w', 'eye');
    expect(empties).toBe(2);
  });

  it('asks for no pool when the read reads no tries, and falls back to the singleton when none can be had', async () => {
    let asked = 0;
    const single: string[] = [];
    const noTries = await surfaceBoardReader('learn', false, async () => { asked += 1; return null; }, async (fen, d) => { single.push(fen); return analysis(fen, d); });
    await noTries.read('a w', 'best-after');
    expect(asked).toBe(0);
    const noPool = await surfaceBoardReader('learn', true, async () => { asked += 1; return null; }, async (fen, d) => { single.push(fen); return analysis(fen, d); });
    await noPool.read('b w', 'eye');
    noPool.release();
    expect(asked).toBe(1);
    expect(single).toEqual(['a w', 'b w']);
  });
});

describe('boardReadFacts — every try read, all asked together', () => {
  it('asks each try\'s board at once with its source, so a pooled reader runs them in parallel', async () => {
    const { boardReadFacts } = await import('./boardReadFacts');
    const fen = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    let live = 0;
    let peak = 0;
    const sources = new Map<TrySource, number>();
    const read = async (_f: string, source: TrySource): Promise<StockfishAnalysis['topLines']> => {
      sources.set(source, (sources.get(source) ?? 0) + 1);
      live += 1; peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 1));
      live -= 1;
      return [{ rank: 1, evaluation: 20, mate: null, moves: [] }];
    };
    await boardReadFacts({ fen, studentColor: 'w', rating: 1400, before: [{ rank: 1, evaluation: 30, mate: null, moves: ['c2c3', 'g8f6', 'd2d4'] }],
      read, withhold: false, tense: 'now', history: [], theory: false, readTempting: true, engineFutures: false, studentNeedContext: null, story: null });
    // The eye's tries and the moves weighed for a reason are all read, side by side.
    expect(peak).toBeGreaterThan(1);
    expect(sources.get('eye') ?? 0).toBeGreaterThan(0);
    expect([...sources.keys()].some((s) => s !== 'eye' && s !== 'best-after' && s !== 'their-eye')).toBe(true);
    expect(sources.get('best-after')).toBe(1);
  }, 60_000);
});
