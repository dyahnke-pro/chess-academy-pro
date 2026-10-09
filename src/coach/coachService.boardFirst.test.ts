/**
 * A QUESTION ABOUT THIS BOARD IS ANSWERED FROM THE BOARD (live replay
 * 2026-10-08: "how do I attack the king?" got a book essay on opposite-wing
 * castling with both kings castled short, and read the student's own king).
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { coachService } from './coachService';

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 })); });
afterEach(() => { vi.restoreAllMocks(); });

it('"how do I attack the king?" reads THEIR king on this board, and says what to do', async () => {
  const fen = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7';
  const r = await coachService.ask({ surface: 'game-chat', ask: 'how do I attack the king?', liveState: { surface: 'game-chat', fen, whoseTurn: 'white', studentColor: 'white', moveHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nc3', 'Nf6', 'd3', 'O-O', 'O-O'], currentRoute: '/coach/teach' } }, { maxToolRoundTrips: 1 });
  expect(r.text).toMatch(/^Their king looks safe/);
  expect(r.text).toMatch(/build first/);
  expect(r.text).not.toMatch(/opposite wings|pawn-storms/);
}, 120_000);
