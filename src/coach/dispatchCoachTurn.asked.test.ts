/**
 * A QUESTION ABOUT THE BOARD REACHES THE RECORD THROUGH THE ONE DOOR (David
 * 2026-11-07: asked questions feed the need score across games). A wire that
 * does not fire is not a wire: a typed "what's the best move?" on a board holding
 * a fork writes the skill the board posed; a question about the student's
 * record on the same board writes nothing.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { db } from '../db/schema';
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations } from './dispatchCoachTurn';
import { askedCountsSince } from '../services/askedRecord';

// A knight on d5 forks the king on e8 and the rook on a8 (Nc7+).
const FORK = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';

beforeEach(async () => {
  await db.delete(); await db.open();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  setChatTurnReaderForTests(async () => null as never);
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const ask = (q: string) => dispatchCoachTurn({
  surface: 'standalone-chat', ask: q, origin: 'typed',
  liveState: { surface: 'standalone-chat', fen: FORK, whoseTurn: 'white', studentColor: 'white', currentRoute: '/coach/chat', userJustDid: q, engineBestMoveUci: 'd5c7', moveHistory: [] },
} as never, { maxToolRoundTrips: 1 });

describe('a board question is remembered by the skills the board posed', () => {
  it('"what\'s the best move?" on a fork writes missed-tactic', async () => {
    await ask("what's the best move?");
    await vi.waitFor(async () => { expect((await askedCountsSince(0)).get('missed-tactic')).toBe(1); }, { timeout: 15_000 });
  }, 60_000);

  it('twin: "what is my rating?" on the same board writes nothing', async () => {
    await ask('what is my rating?');
    await new Promise((r) => setTimeout(r, 1_500));
    expect((await askedCountsSince(0)).size).toBe(0);
  }, 60_000);
});
