/**
 * A TURN WITH NO CHESS IN IT IS NOT A POSITION QUESTION (live replay
 * 2026-10-09: "You suck", "Books", "Do you understand me" and "D5" were each
 * answered "The best move is rook takes on g7 with check").
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
const FEN = 'r4rk1/pb3pp1/1p2pq1p/2p5/4P3/2P2NNP/PP3PP1/R1BQR1K1 w - - 0 21';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => ({ fen: FEN, pvSan: ['e5', 'Qg6', 'Nh4'], evalCp: 380, mateIn: null, bestMoveUci: 'e4e5', depth: 18, studentSide: 'white' })),
  buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { coachService } from './coachService';

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 })); });
afterEach(() => { vi.restoreAllMocks(); });

const ask = async (q: string): Promise<string> => (await coachService.ask(
  { surface: 'game-chat', ask: q, liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: [], currentRoute: '/coach/teach' } },
  { maxToolRoundTrips: 1 },
)).text;

it.each(['You suck', 'Books', 'Name a famous chess player', 'lol whatever', 'do you like pizza?', 'my cat is asleep', 'ugh'])(
  'no board readout nobody asked for: %s', async (q) => {
    expect(await ask(q)).not.toMatch(/material|best move|pawn break/i);
  }, 120_000,
);

it.each(['Should I resign?', 'what now?', 'where do I go from here', 'what should I do next', 'how am I doing in this one?', 'whats happening here'])(
  'a question about the game in front of them gets the read: %s', async (q) => {
    expect(await ask(q)).toMatch(/material|pawn break|better|winning|up about|threat|attack/i);
  }, 120_000,
);

it('"do you understand me" says the coach is listening', async () => {
  expect(await ask('Do you understand me')).toMatch(/^(?:I am here|Yes, I am listening)/);
}, 120_000);


it('"What is en passant?" gets the rule and what it means on this board', async () => {
  const t = await ask('What is en passant?');
  expect(t).toMatch(/^En passant is a pawn capture/);
  expect(t).toMatch(/no en passant capture available on this board/);
}, 120_000);

it('"Why can\'t I castle?" reads the student\'s own rights off the board', async () => {
  expect(await ask("Why can't I castle?")).toMatch(/^You can no longer castle kingside/);
}, 120_000);
