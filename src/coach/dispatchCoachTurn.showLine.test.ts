/**
 * "SHOW ME" PLAYS THE LAST PROOF (WO-CHAT-01). A student who heard a line
 * says "show me" / "play it out" and the board plays it — on every screen,
 * from the one door, never a second line of reasoning about the words.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations, lastLineFor } from './dispatchCoachTurn';
import { readTurnInCode } from './chatTurnCodeReader';

// 1.e4 e5 2.Nf3 Nc6 3.Bc4 — the student is White, Black to move.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  setChatTurnReaderForTests(async () => null as never);
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const ask = (q: string) => dispatchCoachTurn({
  surface: 'game-chat', ask: q, origin: 'typed',
  liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'black', studentColor: 'white', moveHistory: LINE, currentRoute: '/coach/teach' },
} as never, { maxToolRoundTrips: 1 });

describe('"show me"', () => {
  it.each(['show me', 'Show me!', 'play it out', 'walk me through it', 'show me the line'])('"%s" is read in code as the show-line request', (q) => {
    const t = readTurnInCode(q, { fen: FEN, history: LINE, studentColor: 'white' } as never);
    expect(t?.steps?.map((s) => s.action)).toEqual(['show-line']);
  });
  it.each(['show me the Italian', 'show me how to castle', 'what does that show me?'])('"%s" is not', (q) => {
    const t = readTurnInCode(q, { fen: FEN, history: LINE, studentColor: 'white' } as never);
    expect(t?.steps?.some((s) => s.action === 'show-line') ?? false).toBe(false);
  });
  it('with nothing said yet, asks for a line first and walks nothing', async () => {
    const a = await ask('show me');
    expect(a.autoWalk).toBeUndefined();
    expect(a.text).toMatch(/no line to show yet/);
  }, 60_000);
  it('after an answer with a proof, plays that proof', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'attack-piece', referents: [{ type: 'square', square: 'c4' }], seat: 'them', topic: null }) as never);
    const first = await ask('can they attack my bishop on c4?');
    setChatTurnReaderForTests(async () => null as never);
    const proof = first.lines?.[0];
    expect(proof).toBeDefined();
    expect(lastLineFor('game-chat')).toEqual(proof);
    const shown = await ask('show me');
    expect(shown.autoWalk).toEqual(proof);
    expect(shown.text).toMatch(/^Playing the line out on the board/);
  }, 60_000);
});
