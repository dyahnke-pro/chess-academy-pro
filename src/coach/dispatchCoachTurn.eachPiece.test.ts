/**
 * A NAME THAT MATCHES SEVERAL PIECES IS ANSWERED FOR EACH (chat-surfaces audit
 * 2026-11-06). "Can they attack my knight?" on the starting position — and in
 * Learn, Play, Analyse and Review — was asked back "Which knight — the one on
 * b1 or the one on g1?". The question holds over every knight, so the coach
 * answers it for every knight; a question about ONE piece still asks which.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations } from './dispatchCoachTurn';
import { validateChatTurn, nextConversationState, EMPTY_CONVERSATION } from './chatTurn';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 — both White knights developed, neither attacked.
const FOUR_KNIGHTS = (() => { const c = new Chess(); for (const m of 'e4 e5 Nf3 Nc6 Nc3 Nf6'.split(' ')) c.move(m); return c.fen(); })();

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const askAbout = async (fen: string, q: string, kind: string, piece: string, seat: 'me' | 'them'): Promise<string> => {
  setChatTurnReaderForTests(async () => ({ kind, referents: [{ type: 'piece', piece, square: null, seat }], seat: kind === 'attack-piece' ? 'them' : seat, topic: null }) as never);
  return (await dispatchCoachTurn({
    surface: 'game-chat', ask: q, origin: 'typed',
    liveState: { surface: 'game-chat', fen, whoseTurn: 'white', studentColor: 'white', moveHistory: [], currentRoute: '/coach/teach' },
  } as never, { maxToolRoundTrips: 1 })).text;
};

describe('a question that holds over every matching piece', () => {
  it('"can they attack my knight?" at the start answers for both knights, never "which knight?"', async () => {
    const a = await askAbout(START, 'can they attack my knight?', 'attack-piece', 'knight', 'me');
    expect(a).not.toMatch(/Which knight/);
    expect(a).toBe('Nothing of theirs can get at your knights on b1 or g1 next move.');
  }, 60_000);

  it('each knight that CAN be attacked gets its own line', async () => {
    const a = await askAbout(FOUR_KNIGHTS, 'can they attack my knight?', 'attack-piece', 'knight', 'me');
    expect(a).not.toMatch(/Which knight/);
    expect(a).toMatch(/They can attack your knight on c3: .*Bb4/);
    expect(a).toMatch(/They can attack your knight on f3: .*Nd4/);
  }, 60_000);

  it('the validator resolves every matching piece for these kinds — and still asks for a one-piece question', () => {
    const board = { fen: START, history: [], studentColor: 'white' as const };
    const each = validateChatTurn({ kind: 'is-piece-loose', seat: 'me', topic: null, referents: [{ type: 'piece', piece: 'n', square: null, seat: 'me' }] }, board);
    expect(each.ok).toBe(true);
    if (each.ok) expect(each.turn.referents.map((r) => r.type === 'piece' && r.square)).toEqual(['b1', 'g1']);
    const one = validateChatTurn({ kind: 'what-about-piece', seat: 'me', topic: null, referents: [{ type: 'piece', piece: 'n', square: null, seat: 'me' }] }, board);
    expect(one.ok).toBe(false);
    if (!one.ok) expect(one.clarify).toBe('Which knight — the one on b1 or the one on g1?');
  });

  it('after an answer about both knights, "it" names neither', () => {
    const v = validateChatTurn({ kind: 'attack-piece', seat: 'them', topic: null, referents: [{ type: 'piece', piece: 'n', square: null, seat: 'me' }] }, { fen: START, studentColor: 'white' });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const memory = nextConversationState(EMPTY_CONVERSATION, v.turn, 'white');
    expect(memory.lastPiece).toBeNull();
    expect(memory.lastSquare).toBeNull();
  });
});
