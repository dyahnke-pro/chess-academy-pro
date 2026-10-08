/**
 * ONE ENGINE READ PER POSITION (live Learn walk 2026-10-08). After 1.e4 d5
 * 2.Nf3 c6 the coach said "the engine plays e5" to "Why?" and "the best move
 * is Nc3" to "what is the best move here?" — the surface's threaded move was
 * the eval bar's shallow cached read, the why-lane's plan was the deeper one.
 * Every move question now reads the same plan, so the two cannot disagree.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../services/enginePlanContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/enginePlanContext')>();
  return {
    ...actual,
    buildEnginePlan: vi.fn(async (fen: string, studentSide: 'white' | 'black') => ({
      fen, pvSan: ['e5', 'Bf5', 'd4', 'e6'], bestMoveUci: 'e4e5', evalCp: 40, mateIn: null, depth: 20, studentSide,
    })),
  };
});

import { coachService } from './coachService';

const FEN = 'rnbqkbnr/pp2pppp/2p5/3p4/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

async function ask(q: string): Promise<string> {
  const ans = await coachService.ask(
    {
      surface: 'game-chat', ask: q,
      liveState: {
        surface: 'game-chat', fen: FEN, whoseTurn: 'white', studentColor: 'white',
        moveHistory: ['e4', 'd5', 'Nf3', 'c6'], currentRoute: '/coach/teach',
        // The eval bar's shallow cached read — a different move.
        engineBestMoveUci: 'b1c3', evalCp: 40,
      },
    },
    { maxToolRoundTrips: 3 },
  );
  return ans.text;
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
});
afterEach(() => { vi.restoreAllMocks(); });

describe('one engine read per position', () => {
  it('"best move?" and "why is it best?" name the same move', async () => {
    const best = await ask('What is the best move here?');
    const why = await ask('Why is that the best move?');
    expect(best).toMatch(/\be5\b/);
    expect(best).not.toMatch(/Nc3/);
    expect(why).toMatch(/\be5\b/);
    expect(why).not.toMatch(/Nc3/);
  }, 30_000);
});
