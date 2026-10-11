// Hard-question walk 2026-10-11 (GothamChess–AlexOstrovskiy, London): a line
// the student names is played out and its outcome said — never refused as an
// illegal move of theirs, never answered about a different move.
import { describe, it, expect, afterEach } from 'vitest';
import { readTurnInCode } from './chatTurnCodeReader';
import { validateChatTurn } from './chatTurn';
import { lineOutcomeAnswer, setBoardEngineForTests } from './boardTurnAnswer';
import type { WalkableLine } from '../types';

// 1.d4 d5 2.Bf4 Nf6 — White to move.
const AFTER_NF6 = 'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 2 3';
// …6.h5 Nxh5 — White to move, the Rxh5 sacrifice next.
const AFTER_NXH5 = 'rnbq1rk1/ppp1ppbp/6p1/3p3n/3P1B2/2N1P3/PPP2PP1/R2QKBNR w KQ - 0 7';
const board = (fen: string) => ({ fen, history: [], studentColor: 'white' as const });

afterEach(() => setBoardEngineForTests(null));

describe('a named line', () => {
  it('"if Black plays c5 and I take dxc5" is read as a line, their move first', () => {
    const t = readTurnInCode('If Black plays c5 and I take dxc5, what then?', board(AFTER_NF6) as never)!;
    expect(t.kind).toBe('line-outcome');
    expect(t.referents).toEqual([{ type: 'move', san: 'c5' }, { type: 'move', san: 'dxc5' }]);
    const v = validateChatTurn(t, board(AFTER_NF6) as never);
    expect(v.ok).toBe(true);
  });

  it('a line naming their move is never refused as illegal for the student', () => {
    const v = validateChatTurn({ kind: 'candidate-move', referents: [{ type: 'move', san: 'c5' }, { type: 'move', san: 'dxc5' }], seat: null, topic: null }, board(AFTER_NF6) as never);
    expect(v.ok).toBe(true);
  });

  it('"calculate Rxh5 gxh5 Qxh5" plays the line and counts it: the rook for a knight and a pawn', async () => {
    setBoardEngineForTests({
      // After 7.Rxh5 gxh5 8.Qxh5, Black to move: …e6, White better.
      analysis: async () => ({ topLines: [{ rank: 1, evaluation: 110, mate: null, moves: ['e7e6'] }], evaluation: 110, isMate: false, mateIn: null, depth: 18, seldepth: 20, wdl: null }) as never,
      candidate: async () => null,
    });
    const t = readTurnInCode('Calculate Rxh5 gxh5 Qxh5 — count the material', board(AFTER_NXH5) as never)!;
    expect(t.kind).toBe('line-outcome');
    const v = validateChatTurn(t, board(AFTER_NXH5) as never);
    expect(v.ok).toBe(true);
    const out: { lines?: WalkableLine[] } = {};
    const text = await lineOutcomeAnswer(v.ok ? v.turn : (null as never), board(AFTER_NXH5), out);
    expect(text).toBe("After Rxh5, …gxh5 and Qxh5, you come out a pawn down. Then their best reply is …e6, and you're slightly better.");
    expect(out.lines?.[0].plies.map((p) => p.san)).toEqual(['Rxh5', 'gxh5', 'Qxh5', 'e6']);
  });

  it('a line that ends in mate says so', async () => {
    const BEFORE_QG7 = '2r4k/pp5p/2q1P3/7N/4p3/4P1Q1/bPPr1P2/2K3N1 w - - 0 24';
    const text = await lineOutcomeAnswer({ kind: 'line-outcome', referents: [{ type: 'move', san: 'Qg7#', played: false }], seat: null, topic: null }, board(BEFORE_QG7));
    expect(text).toBe("After Qg7#, it's mate — you win.");
  });
});
