/** "It's not letting me take b5" — the coach says WHY (live replay 2026-10-09). */
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chess } from 'chess.js';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { coachService } from './coachService';

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 })); });
afterEach(() => { vi.restoreAllMocks(); });

it('a pinned knight: the refusal names the pin', async () => {
  const moves = ['e4', 'e5', 'Nc3', 'Nf6', 'd3', 'Bb4', 'Bg5', 'd6'];
  const c = new Chess(); for (const m of moves) c.move(m);
  const r = await coachService.ask({ surface: 'game-chat', ask: "It's not letting me play Nb5", liveState: { surface: 'game-chat', fen: c.fen(), whoseTurn: 'white', studentColor: 'white', moveHistory: moves, currentRoute: '/coach/teach' } }, { maxToolRoundTrips: 1 });
  expect(r.text).toMatch(/knight on c3 is pinned — moving it would expose your king to their bishop on b4/);
}, 120_000);
