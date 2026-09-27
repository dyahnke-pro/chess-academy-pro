// Carlsen–Aronian review walk (2026-09-27): three plies said "You: that was an
// inaccuracy, costing about 0.7 points." and nothing else — because the deeper
// search's best move WAS the move played, so there was no better move to name.
// When the deep search agrees with the move, the shallow cost was noise.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';

vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  isBookLine: () => false,
}));

import { analyzeGameOnWorker } from './gameAnalysisService';
import { buildGameRecord, buildEngineAnalysis } from '../test/factories';
import { db } from '../db/schema';

const GAME = buildGameRecord({ pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1 a6 8.h3 Ba7 9.Nbd2 Re8 1-0' });
const c = new Chess();
for (const m of 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6'.split(' ')) c.move(m);
const beforeNf3 = c.fen();
c.move('h3');
const afterNf3 = c.fen();

function workerWithBest(bestAtNf3: string) {
  return {
    analyzePosition: vi.fn((fen: string) => {
      if (fen === beforeNf3) return Promise.resolve(buildEngineAnalysis({ evaluation: 40, bestMove: bestAtNf3, depth: 30 }));
      if (fen === afterNf3) return Promise.resolve(buildEngineAnalysis({ evaluation: -300, bestMove: 'b8c6', depth: 30 }));
      return Promise.resolve(buildEngineAnalysis({ evaluation: 40, bestMove: 'a2a3', depth: 30 }));
    }),
    destroy: vi.fn(), newGame: vi.fn(),
  } as never;
}

describe('a flagged move the deep search also plays is not a mistake', () => {
  // Each case gets its own engine; the persisted position cache would hand the
  // second case the first one's answer.
  beforeEach(async () => { await db.delete(); await db.open(); });
  it('h3 flagged shallow, deep best is h3 → good, no bare verdict', async () => {
    const r = await analyzeGameOnWorker(GAME, workerWithBest('h2h3'));
    const h3 = r?.annotations.find((a) => a.san === 'h3');
    expect(h3?.bestMove).toBeNull();
    expect(h3?.classification).toBe('good');
  });
  it('NEGATIVE CONTROL: deep best differs → the verdict stands with a better move', async () => {
    const r = await analyzeGameOnWorker(GAME, workerWithBest('d3d4'));
    const h3 = r?.annotations.find((a) => a.san === 'h3');
    expect(h3?.bestMove).toBe('d3d4');
    expect(['inaccuracy', 'mistake', 'blunder']).toContain(h3?.classification);
  });
});
