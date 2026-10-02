import { describe, it, expect } from 'vitest';
import { readWrongTry, type RefutationEngine } from './wrongTryRefutation';
import type { StockfishAnalysis } from '../types';

function engineSays(bestMove: string, evaluation: number, isMate = false): RefutationEngine {
  return {
    analyzePosition: () => Promise.resolve({
      bestMove, evaluation, isMate, mateIn: null, depth: 12, topLines: [], nodesPerSecond: 0,
    } as StockfishAnalysis),
  };
}

// Real puzzle from the hand walk 2026-10-01: Black to move; R2b3 drops d6.
const FEN = '1r4k1/p2b1p1p/3ppbp1/q7/4P3/P1PQ1NPP/1r3PB1/R1R3K1 b - - 2 23';

describe('readWrongTry — what a wrong try runs into', () => {
  it('names the refutation, from the board, in the weighing register', async () => {
    const r = await readWrongTry(FEN, 'R2b3', engineSays('d3d6', 66));
    expect(r).toEqual(expect.objectContaining({ kind: 'refuted', text: 'R2b3? Then Qxd6, winning your pawn on d6.', replyFrom: 'd3', replyTo: 'd6' }));
  });

  it('a try that still wins is never called wrong', async () => {
    // Black to move, so White-POV -400 means Black is +4 after the try.
    const r = await readWrongTry(FEN, 'R2b3', engineSays('d3d6', -400));
    expect(r?.kind).toBe('also-good');
    expect(r?.text).toMatch(/still keeps you on top/);
  });

  it('silent when the refutation is quiet — no vague sentence', async () => {
    // a quiet reply that wins nothing concrete
    const r = await readWrongTry(FEN, 'R2b3', engineSays('g1h2', 66));
    expect(r).toBeNull();
  });

  it('a forced mate against the try is said as mate', async () => {
    const r = await readWrongTry(FEN, 'R2b3', engineSays('g1h2', 100000, true));
    expect(r?.text).toBe('R2b3? Then Kh2, and they have a forced mate.');
  });

  it('an illegal try reads nothing', async () => {
    expect(await readWrongTry(FEN, 'Qh1', engineSays('d3d6', 66))).toBeNull();
  });
});
