/**
 * Chat thinks like the coach (2026-10-09): a decoded move question is answered
 * by the coach's own weighing, about the move the student NAMED.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { answerBoardTurn, setBoardEngineForTests } from './boardTurnAnswer';
import type { ResolvedChatTurn } from './chatTurn';

const LINE = ['e4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'd5'];
const c = new Chess(); for (const m of LINE) c.move(m);
const FEN = c.fen();
const board = { fen: FEN, history: LINE, studentColor: 'white' as const };
const turn = (kind: 'why-best-move' | 'candidate-move', san: string): ResolvedChatTurn =>
  ({ kind, referents: [{ type: 'move', san, played: false }], seat: 'me', topic: null } as unknown as ResolvedChatTurn);

beforeEach(() => {
  setBoardEngineForTests({
    // The engine's choice: exd5 (+0.4); Nxe5 is close (+0.2).
    analysis: async () => ({ topLines: [
      { rank: 1, evaluation: 40, mate: null, moves: ['e4d5', 'f6d5', 'c3d5', 'd8d5'] },
      { rank: 2, evaluation: 20, mate: null, moves: ['f3e5', 'd5e4'] },
    ] }),
    // Nd5 drops the knight: Nxd5 exd5 Qxd5.
    candidate: async (_fen, san) => san === 'Nxd5'
      ? { evalCp: -260, mateIn: null, lineUci: ['f6d5', 'e4d5', 'd8d5'] }
      : { evalCp: 20, mateIn: null, lineUci: ['d5e4'] },
  });
});
afterEach(() => { setBoardEngineForTests(null); vi.restoreAllMocks(); });

describe('the named move is weighed, never ignored', () => {
  it('"why is Nxd5 best?" — it is not; worse with no line, so it says so plainly', async () => {
    expect(await answerBoardTurn(turn('why-best-move', 'Nxd5'), board)).toBe("Nxd5 isn't the best move here. It is clearly worse than exd5.");
  });
  it('"why is Bb5 best?" — it hangs the bishop, and the line proves it', async () => {
    const l = ['e4', 'a6'];
    const b = new Chess(); for (const m of l) b.move(m);
    setBoardEngineForTests({
      analysis: async () => ({ topLines: [{ rank: 1, evaluation: 40, mate: null, moves: ['d2d4', 'd7d5'] }] }),
      candidate: async () => ({ evalCp: -300, mateIn: null, lineUci: ['a6b5'] }),
    });
    const a = await answerBoardTurn(turn('why-best-move', 'Bb5'), { fen: b.fen(), history: l, studentColor: 'white' });
    expect(a).toMatch(/^Bb5 isn't the best move here\. Bb5\? Then axb5/);
    expect(a).toMatch(/d4/);
  });
  it('"is exd5 good?" — the best move, with its reason', async () => {
    expect(await answerBoardTurn(turn('candidate-move', 'exd5'), board)).toMatch(/^exd5 is the best move here/);
  });
  it('"is Nxe5 ok?" — inside the coin-flip band it is "about as good"', async () => {
    expect(await answerBoardTurn(turn('candidate-move', 'Nxe5'), board)).toMatch(/^Nxe5 is fine — about as good as the engine's exd5/);
  });
  it('not the student\'s move, or a move already played: falls back', async () => {
    expect(await answerBoardTurn(turn('candidate-move', 'Nd5'), { ...board, studentColor: 'black' })).toBeNull();
    expect(await answerBoardTurn({ ...turn('candidate-move', 'e4'), referents: [{ type: 'move', san: 'e4', played: true }] } as unknown as ResolvedChatTurn, board)).toBeNull();
  });
});
