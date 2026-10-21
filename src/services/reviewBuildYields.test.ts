import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';

// Review freeze, 2026-10-21 (profiled on the production build): after Start the
// screen was busy ~99% for ~95 s. The whole game's narration was built in ONE
// task, then each projected line's facts in another — and an engine read that
// is already cached resolves as a microtask, so "async" handed nothing back.
// The build now pauses before every move, and a projected line between plies.
const yields = vi.hoisted(() => ({ n: 0 }));
vi.mock('../utils/yieldToScreen', () => ({
  yieldToScreen: (): Promise<void> => { yields.n += 1; return Promise.resolve(); },
}));

import { buildReviewSegmentsForTests, buildReviewSegmentsYielding, type ReviewMoveInput } from './coachFeatureService';
import { computePvLine, type PvEngine } from './pvPlayback';

const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'c3', 'Nf6', 'O-O', 'O-O'];

function inputs(): ReviewMoveInput[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    const mv = c.move(san);
    return {
      ply: i + 1, san: mv.san, isCoachMove: false, classification: 'book' as const,
      evaluation: 20, preMoveEval: 20, bestMove: null, fenAfter: c.fen(),
    };
  });
}

beforeEach(() => { yields.n = 0; });

describe('the review build hands the screen back', () => {
  it('pauses before every move, and says exactly what the one-pass build says', async () => {
    const stepped = await buildReviewSegmentsYielding(inputs(), 'white', 'Italian Game', false, 1400);
    expect(yields.n).toBeGreaterThanOrEqual(SANS.length);
    const onePass = buildReviewSegmentsForTests(inputs(), 'white', 'Italian Game', false, 1400);
    expect(stepped.map((s) => s.narration)).toEqual(onePass.map((s) => s.narration));
    expect(stepped.length).toBe(onePass.length);
  });

  it('a projected line pauses between its plies', async () => {
    const fen = new Chess().fen();
    const engine: PvEngine = {
      analyzePosition: (): Promise<StockfishAnalysis> => Promise.resolve({
        bestMove: 'e2e4', evaluation: 20, isMate: false, mateIn: null, depth: 14, nodesPerSecond: 0,
        topLines: [{ rank: 1, evaluation: 20, moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'], mate: null }],
      }),
    };
    const line = await computePvLine(fen, { engine, maxPlies: 4 });
    expect(line?.plies).toHaveLength(4);
    expect(yields.n).toBeGreaterThanOrEqual(4);
  });
});
