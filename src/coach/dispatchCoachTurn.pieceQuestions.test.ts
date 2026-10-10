/**
 * PIECE QUESTIONS, FROM THE LIVE REPLAY (2026-10-09), asked in the same order
 * a student asked them — the second must not inherit the first one's piece.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chess } from 'chess.js';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations } from './dispatchCoachTurn';
import { readTurnInCode } from './chatTurnCodeReader';

const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];
const c = new Chess(); for (const m of LINE) c.move(m);
const FEN = c.fen();

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

describe('piece questions', () => {
  it('"what is my bishop on c4 aiming at?" says what it hits', async () => {
    const a = await ask('What is my bishop on c4 aiming at?');
    expect(a).toMatch(/^Your bishop on c4 attacks their pawn on f7\./);
  }, 60_000);
  it('"are any of my pieces hanging?" scans every piece, not the last one named', async () => {
    await ask('What is my bishop on c4 aiming at?');
    expect(await ask('Are any of my pieces hanging right now?')).not.toMatch(/^Your bishop on c4/);
  }, 60_000);
  it('"how do I attack the king?" is not a question about the student\'s king', () => {
    const t = readTurnInCode('how do I attack the king?', { fen: FEN, history: LINE, studentColor: 'white' } as never);
    expect(t?.kind).not.toBe('what-about-piece');
  });
  it('a piece that is not there is answered as a board fact, not routed to a book passage', async () => {
    const a = await ask('how do I defend my knight on d4?');
    expect(a).toBe("There's no knight on d4 — which piece did you mean?");
  }, 60_000);
});
