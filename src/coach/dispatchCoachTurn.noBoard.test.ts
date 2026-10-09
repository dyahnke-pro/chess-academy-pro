/**
 * NO BOARD, ONE ANSWER (all-screens walk 2026-10-09). On the board-less chat
 * page, four board questions got four answers from four producers — and "is
 * anything of mine hanging?" got "Nothing of yours is hanging right now", a
 * fact about a board nobody read. The door answers it: there is no board.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations } from './dispatchCoachTurn';

const NO_BOARD = 'There is no board on this screen. Open a game or a lesson and ask there.';

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const ask = async (q: string, kind: string): Promise<string> => {
  setChatTurnReaderForTests(async () => ({ kind, referents: [], seat: null, topic: null }) as never);
  return (await dispatchCoachTurn({
    surface: 'standalone-chat', ask: q, origin: 'typed',
    liveState: { surface: 'standalone-chat', currentRoute: '/coach/chat' },
  } as never, { maxToolRoundTrips: 1 })).text;
};

describe('a board question with no board', () => {
  it.each([
    ['is anything of mine hanging?', 'is-piece-loose'],
    ['can they attack my knight?', 'attack-piece'],
    ["what's the plan here?", 'plan'],
    ["what's the best move here?", 'best-move'],
  ])('%s → the one no-board answer', async (q, kind) => {
    expect(await ask(q, kind)).toBe(NO_BOARD);
  }, 60_000);
});
