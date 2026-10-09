/**
 * THE DECODED QUESTION REACHES THE BOARD, WHATEVER THE WORDING (2026-10-09).
 * "Why is Ne4 best?" was read correctly and answered about Kh1, because the
 * door re-worded the reading into a lane that dropped the move. Every
 * phrasing below names one move; each answer must be about THAT move.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chess } from 'chess.js';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { dispatchCoachTurn, setChatTurnReaderForTests } from './dispatchCoachTurn';
import { setBoardEngineForTests } from './boardTurnAnswer';

const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'];
const c = new Chess(); for (const m of LINE) c.move(m);
const FEN = c.fen();

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  // The model reader is not consulted here: the sentence computer reads these.
  setChatTurnReaderForTests(async () => null as never);
  setBoardEngineForTests({
    analysis: async () => ({ topLines: [
      { rank: 1, evaluation: 30, mate: null, moves: ['f1b5', 'f8b4'] },
      { rank: 2, evaluation: 25, mate: null, moves: ['d2d4', 'e5d4'] },
    ] }),
    candidate: async (_f, san) => ({ evalCp: san === 'Bb5' ? 30 : -120, mateIn: null, lineUci: ['f8b4'] }),
  });
});
afterEach(() => { setBoardEngineForTests(null); setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const served: Record<string, string | undefined> = {};
const ask = async (q: string): Promise<string> => { const r = await dispatchCoachTurn({
  surface: 'game-chat', ask: q, origin: 'typed',
  liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: LINE, currentRoute: '/coach/teach' },
} as never, { maxToolRoundTrips: 1 }); served[q] = r.servedIntent; console.log('ANS', q, '|', r.servedIntent, '|', r.text); return r.text; };

describe('a named move is answered about that move', () => {
  it.each([
    'Why is Ng5 best?', 'why is night g 5 best', 'is ng5 good?', 'Is Ng5 ok here?', 'Should I play Ng5?', 'what about Ng5',
  ])('%s', async (q) => {
    const a = await ask(q);
    expect(a).toMatch(/^Ng5/);
    expect(a).toMatch(/Bb5/);
    expect(served[q]).toMatch(/^board:/);
  }, 60_000);
  it('the engine\'s own move is confirmed as best', async () => {
    expect(await ask('Is Bb5 good?')).toMatch(/^Bb5 is the best move here/);
  }, 60_000);
});
