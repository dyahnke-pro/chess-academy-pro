import { describe, it, expect } from 'vitest';
import type { StockfishAnalysis } from '../types';
import { searchUntilStable, sharpness, floorFor, isStable, SEARCH_POLICY, type DepthSearcher } from './searchDepth';
import { onSearchDepth, type SearchDepthRow } from './searchDepthEvents';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// White to move in check from the queen, with a loose knight — sharp.
const SHARP = 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3';

const analysis = (depth: number, bestMove: string, evaluation: number): StockfishAnalysis => ({
  bestMove, evaluation, isMate: false, mateIn: null, depth, topLines: [], nodesPerSecond: 0,
});

/** A fake engine: `table(depth)` says what it would answer at that depth. It
 *  records the depths it was asked for and advances a fake clock by `costMs`. */
function fakeEngine(table: (d: number) => [string, number], costMs = 100): DepthSearcher & { asked: number[]; clock: () => number } {
  let t = 0;
  const asked: number[] = [];
  return {
    asked,
    clock: () => t,
    async analyzeWithBudget(_fen, depth) {
      asked.push(depth); t += costMs;
      const [m, e] = table(depth);
      return analysis(depth, m, e);
    },
  };
}

describe('searchUntilStable', () => {
  it('a quiet position that agrees at every depth stops at its floor', async () => {
    const eng = fakeEngine(() => ['e2e4', 30]);
    const r = await searchUntilStable(START, 'question', eng, eng.clock);
    expect(r.stable).toBe(true);
    expect(r.reason).toBe('stable');
    expect(r.depthReached).toBe(floorFor(SEARCH_POLICY.question, sharpness(START)));
  });

  it('keeps deepening while the best move flips, and stops once it holds', async () => {
    // The 6…Nb6 shape: the shallow reads disagree (10 and 12 differ, 14 and
    // 16 differ again) and the answer holds only from 16 on. Stability cannot
    // see a flip past its horizon — that is what the per-purpose floors are
    // for — so this is the case it CAN handle: disagreement inside the window.
    const eng = fakeEngine((d) => (d === 10 ? ['d2d4', 40] : d === 12 ? ['g1f3', 120] : d === 14 ? ['d2d4', 60] : ['e2e4', 45]));
    const r = await searchUntilStable(START, 'question', eng, eng.clock);
    expect(r.stable).toBe(true);
    expect(r.analysis.bestMove).toBe('e2e4');
    expect(r.depthReached).toBe(18);
    expect(eng.asked).toEqual([10, 12, 14, 16, 18]);
  });

  it('NEGATIVE CONTROL: a search that never settles reaches the ceiling and says so', async () => {
    const eng = fakeEngine((d) => [d % 4 === 0 ? 'e2e4' : 'd2d4', 30]);
    const r = await searchUntilStable(START, 'question', eng, eng.clock);
    expect(r.stable).toBe(false);
    expect(r.reason).toBe('max-depth');
    expect(r.depthReached).toBe(SEARCH_POLICY.question.maxDepth);
  });

  it('a budget that runs out before it settles is reported, never passed off as stable', async () => {
    const eng = fakeEngine((d) => [d % 4 === 0 ? 'e2e4' : 'd2d4', 30], 1500);
    const r = await searchUntilStable(START, 'question', eng, eng.clock);
    expect(r.stable).toBe(false);
    expect(r.reason).toBe('budget');
  });

  it('a search the budget cut short of the depth asked is reported as budget', async () => {
    const eng: DepthSearcher = { async analyzeWithBudget(_f, depth) { return analysis(Math.min(depth, 11), 'e2e4', 20); } };
    const r = await searchUntilStable(START, 'question', eng, () => 0);
    expect(r.reason).toBe('budget');
    expect(r.stable).toBe(false);
  });

  it('a sharp position must reach a higher floor than a quiet one', () => {
    expect(sharpness(SHARP)).toBeGreaterThan(sharpness(START));
    expect(floorFor(SEARCH_POLICY.question, sharpness(SHARP))).toBeGreaterThan(floorFor(SEARCH_POLICY.question, sharpness(START)));
  });

  it('emits one row per search, with the steps it passed through', async () => {
    const rows: SearchDepthRow[] = [];
    const off = onSearchDepth((r) => rows.push(r));
    const eng = fakeEngine(() => ['e2e4', 30]);
    await searchUntilStable(START, 'live', eng, eng.clock);
    off();
    expect(rows).toHaveLength(1);
    expect(rows[0].purpose).toBe('live');
    expect(rows[0].steps.length).toBeGreaterThanOrEqual(SEARCH_POLICY.live.stableFor);
  });
});

describe('isStable', () => {
  it('needs the same move AND the win chance inside the band', () => {
    expect(isStable([{ depth: 14, bestMove: 'a', win: 55 }, { depth: 16, bestMove: 'a', win: 56 }], 2, 3)).toBe(true);
    expect(isStable([{ depth: 14, bestMove: 'a', win: 55 }, { depth: 16, bestMove: 'b', win: 55 }], 2, 3)).toBe(false);
    expect(isStable([{ depth: 14, bestMove: 'a', win: 50 }, { depth: 16, bestMove: 'a', win: 60 }], 2, 3)).toBe(false);
  });
});

describe('a verdict off an unsettled search is said as a first read', () => {
  const GREEK = 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 7';
  it('settled=false appends the hedge; settled=true and null do not', async () => {
    const { assembleCandidateMoveAnswer } = await import('./groundedAnswer');
    const ask = (candidateSettled: boolean | null) => assembleCandidateMoveAnswer({ studentColor: null,
      fen: GREEK, candidateSan: 'Bxh7+', bestMoveUci: 'e1g1', bestEvalCp: 60, candidateEvalCp: 50,
      candidateLineUci: [], candidateSettled,
    })?.facts ?? '';
    expect(ask(false)).toMatch(/first read/);
    expect(ask(true)).not.toMatch(/first read/);
    expect(ask(null)).not.toMatch(/first read/);
  });
});
