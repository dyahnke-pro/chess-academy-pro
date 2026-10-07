// ONE VERDICT PER MOVE (David 2026-10-06: "the same strength engine for learn
// play and review so they stop contradicting each other"). A move Learn already
// graded keeps that grade in review, whatever review's own search says.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';

vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  isBookLine: () => false,
}));

import { analyzeGameOnWorker } from './gameAnalysisService';
import { saveVerdict, getVerdicts, verdictKey } from './moveVerdictStore';
import { buildGameRecord, buildEngineAnalysis } from '../test/factories';
import { db } from '../db/schema';

const GAME = buildGameRecord({ pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1 a6 8.h3 Ba7 9.Nbd2 Re8 1-0' });
const c = new Chess();
for (const m of 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6'.split(' ')) c.move(m);
const beforeH3 = c.fen();
c.move('h3');
const afterH3 = c.fen();

/** An engine that calls h3 a clear fault (+40 → −300, best d4). */
function harshEngine() {
  return {
    analyzePosition: vi.fn((fen: string) => {
      if (fen === beforeH3) return Promise.resolve(buildEngineAnalysis({ evaluation: 40, bestMove: 'd3d4', depth: 30 }));
      if (fen === afterH3) return Promise.resolve(buildEngineAnalysis({ evaluation: -300, bestMove: 'b8c6', depth: 30 }));
      return Promise.resolve(buildEngineAnalysis({ evaluation: 40, bestMove: 'a2a3', depth: 30 }));
    }),
    destroy: vi.fn(), newGame: vi.fn(),
  } as never;
}

describe('the background sweep reads the stored verdict instead of grading again', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('NEGATIVE CONTROL: with nothing stored, the sweep grades h3 a fault (and stores nothing — the sweep is a draft)', async () => {
    const r = await analyzeGameOnWorker(GAME, harshEngine());
    const h3 = r?.annotations.find((a) => a.san === 'h3');
    expect(['inaccuracy', 'mistake', 'blunder']).toContain(h3?.classification);
    expect((await getVerdicts([verdictKey(beforeH3, 'h3')])).size).toBe(0);
  });

  it('Learn said h3 was fine → review says fine too, with no better move', async () => {
    await saveVerdict({ fenBefore: beforeH3, san: 'h3', label: 'fine', cpLoss: 10, bestUci: 'h2h3', depth: 14, source: 'learn' });
    const r = await analyzeGameOnWorker(GAME, harshEngine());
    const h3 = r?.annotations.find((a) => a.san === 'h3');
    expect(h3?.classification).toBe('good');
    expect(h3?.bestMove).toBeNull();
  });

  it('Learn called h3 a mistake → review agrees and names Learn\'s better move', async () => {
    await saveVerdict({ fenBefore: beforeH3, san: 'h3', label: 'mistake', cpLoss: 140, bestUci: 'd3d4', depth: 14, source: 'learn' });
    const gentle = {
      analyzePosition: vi.fn(() => Promise.resolve(buildEngineAnalysis({ evaluation: 40, bestMove: 'h2h3', depth: 30 }))),
      destroy: vi.fn(), newGame: vi.fn(),
    } as never;
    const r = await analyzeGameOnWorker(GAME, gentle);
    const h3 = r?.annotations.find((a) => a.san === 'h3');
    expect(h3?.classification).toBe('mistake');
    expect(h3?.bestMove).toBe('d3d4');
  });

  it('U4 one read: the stored best move wins over this search\'s own pick', async () => {
    // The harsh engine's own pick at this position is d3d4; Learn told the student c4.
    await saveVerdict({ fenBefore: beforeH3, san: 'h3', label: 'mistake', cpLoss: 140, bestUci: 'c3c4', depth: 14, source: 'learn' });
    const r = await analyzeGameOnWorker(GAME, harshEngine());
    const h3 = r?.annotations.find((a) => a.san === 'h3');
    expect(h3?.bestMove).toBe('c3c4');
  });
});
