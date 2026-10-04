import { describe, it, expect, vi } from 'vitest';

// The parser imports the coachApi chokepoint for its default reader; every
// test here injects its own, so the real one must never be reached.
vi.mock('../services/coachApi', () => ({
  readChatTurnStructured: vi.fn(() => { throw new Error('the real reader must not run in this test'); }),
}));

import { coerceChatTurn, parseChatTurn, readerSystemPrompt, CHAT_TURN_SCHEMA } from './chatTurnParser';
import { ALL_CHAT_KINDS } from './chatTurn';

const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';
const board = { fen: FEN, studentColor: 'white' as const };

describe('coerceChatTurn — closed form', () => {
  it('an unknown kind becomes unclear; unknown referents are dropped, nothing invented', () => {
    const c = coerceChatTurn({ kind: 'play_move', referents: [{ type: 'teleport' }, { type: 'square', square: 'E5' }], seat: 'none', english: 'x' });
    expect(c?.turn.kind).toBe('unclear');
    expect(c?.turn.referents).toEqual([{ type: 'square', square: 'e5' }]);
    expect(c?.turn.seat).toBeNull();
  });
  it('reads a piece by its name and carries "the other"', () => {
    const c = coerceChatTurn({ kind: 'is-piece-loose', referents: [{ type: 'piece', piece: 'knight', seat: 'me', other: true }], seat: 'me', english: 'is the other knight loose?' });
    expect(c?.turn.referents).toEqual([{ type: 'piece', piece: 'n', square: null, seat: 'me', other: true }]);
    expect(c?.english).toBe('is the other knight loose?');
  });
  it('NEGATIVE CONTROL — not an object → null', () => {
    expect(coerceChatTurn('best-move')).toBeNull();
    expect(coerceChatTurn(null)).toBeNull();
  });
});

describe('the schema and the prompt come from the kind table', () => {
  it('the kind enum is every kind', () => {
    const props = CHAT_TURN_SCHEMA.properties as { kind: { enum: string[] } };
    expect(props.kind.enum).toEqual(ALL_CHAT_KINDS);
  });
  it('the prompt names every kind and forbids playing a move', () => {
    const p = readerSystemPrompt(null);
    for (const k of ALL_CHAT_KINDS) expect(p).toContain(`- ${k}:`);
    expect(p).toMatch(/never a request to play it/);
  });
});

describe('parseChatTurn', () => {
  it('a bare square answer is read with NO model call', async () => {
    const reader = vi.fn();
    const r = await parseChatTurn('c6 and e5', { board, reader });
    expect(reader).not.toHaveBeenCalled();
    expect(r.source).toBe('square-answer');
    expect(r.turn?.kind).toBe('answer');
    expect(r.validation?.ok).toBe(true);
  });
  it('walk defect 11 — the model reads compare-my-move and the board validates it against the try', async () => {
    const reader = vi.fn(async () => ({ kind: 'compare-my-move', referents: [{ type: 'what-i-played' }], seat: 'me', english: 'why is that move better than what I played?' }));
    const r = await parseChatTurn('why is that move better than what I played?', {
      board: { ...board, lastStudentAttempt: { fenBefore: FEN, san: 'd3' } },
      reader,
    });
    expect(r.source).toBe('llm');
    expect(r.turn?.kind).toBe('compare-my-move');
    expect(r.validation?.ok).toBe(true);
  });
  it('translation is folded into the one read (no second call)', async () => {
    const reader = vi.fn(async () => ({ kind: 'best-move', referents: [], seat: 'me', english: "what's my best move?" }));
    const r = await parseChatTurn('¿cuál es mi mejor jugada?', { board, reader });
    expect(reader).toHaveBeenCalledOnce();
    expect(r.english).toBe("what's my best move?");
  });
  it('a reading the board refuses comes back with a clarifying question', async () => {
    const reader = vi.fn(async () => ({ kind: 'what-about-piece', referents: [{ type: 'piece', piece: 'queen', square: 'h5', seat: 'me' }], seat: 'me', english: 'what about my queen on h5?' }));
    const r = await parseChatTurn('what about my queen on h5?', { board, reader });
    expect(r.validation?.ok).toBe(false);
    if (r.validation && !r.validation.ok) expect(r.validation.clarify).toMatch(/no queen on h5/);
  });
  it('a reader that throws is SILENT (llm-failed), never an error', async () => {
    const reader = vi.fn(async () => { throw new Error('401'); });
    const r = await parseChatTurn('hmm what now', { board, reader });
    expect(r.source).toBe('llm-failed');
    expect(r.turn).toBeNull();
  });
  it('a slow reader times out silently', async () => {
    const reader = vi.fn(() => new Promise(() => { /* never */ }));
    const r = await parseChatTurn('hmm what now', { board, reader, timeoutMs: 20 });
    expect(r.source).toBe('timeout');
  });
});
