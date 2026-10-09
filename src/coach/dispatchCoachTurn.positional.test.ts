/**
 * WALK 5 (2026-10-09): a positional topic in the student's own words is
 * answered by the positional computer with THAT topic — never re-worded to
 * "where are the outposts?". And "how am I doing?" mid-game reads this game.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations } from './dispatchCoachTurn';
import { readTurnInCode } from './chatTurnCodeReader';

// The walk-5 game: a knight down after 4...Nxd4 5.Nc3.
const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nxd4', 'Nc3', 'c5', 'Be2', 'Ne7', 'O-O', 'Ng6'];
const FEN = 'r1bqkb1r/pp1p1ppp/6n1/2p5/3nP3/2N5/PPP1BPPP/R1BQ1RK1 w kq - 2 8';

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  setChatTurnReaderForTests(async () => null as never);
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const ask = async (q: string): Promise<string> => (await dispatchCoachTurn({
  surface: 'game-chat', ask: q, origin: 'typed',
  liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: LINE, currentRoute: '/coach/teach' },
} as never, { maxToolRoundTrips: 1 })).text;

describe('positional topics in the student\'s words (walk 5)', () => {
  it('"what is my worst piece?" names the least active piece first', async () => {
    const a = await ask('what is my worst piece?');
    expect(a).toMatch(/^Your least active is the /);
    expect(a).not.toMatch(/outpost/i);
  }, 60_000);
  it('"where should my rooks go?" names the files', async () => {
    const a = await ask('where should my rooks go?');
    expect(a).toMatch(/-file is (?:half-)?open/);
    expect(a).toMatch(/put a rook/);
  }, 60_000);
  it('"is my king safe?" is king safety, not what the king guards', async () => {
    const a = await ask('is my king safe?');
    expect(a).toMatch(/king/i);
    expect(a).not.toMatch(/^It guards/);
  }, 60_000);
  it('"how am I doing?" with a game on the board is about this game', () => {
    expect(readTurnInCode('how am I doing?', { fen: FEN, history: LINE, studentColor: 'white' } as never)?.kind).toBe('position-assessment');
    expect(readTurnInCode('how am I doing lately?', { fen: FEN, history: LINE, studentColor: 'white' } as never)?.kind).not.toBe('position-assessment');
    expect(readTurnInCode('how am I doing?', { fen: FEN, history: [], studentColor: 'white' } as never)?.kind).not.toBe('position-assessment');
  });
});
