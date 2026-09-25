// CHECKS FIRST (David 2026-09-25, on the 1380 re-walk's 22.gxh5: "checks
// captures threats"). Rxf8+ was cleaner because it is a CHECK that keeps the
// capture: Rxf8+ Kxf8 gxh5 — you get both. Engine line from Stockfish 18,
// depth 16: Rxf8+ Kxf8 gxh5 g6 Qg3 Bc5 (+6.79 vs gxh5 +4.18).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { checksFirst, callInaccuracy } from './inaccuracyCall';

const LINE = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3 Rxf3 Rd8 g4 f5 Rxd8 Qe7'.split(' ');
const fen = (): string => { const c = new Chess(); for (const s of LINE) c.move(s); return c.fen(); };
const BEST_LINE = ['d8f8', 'g8f8', 'g4h5', 'g7g6', 'e1g3', 'b4c5'];

describe('checks first — the move order is the reason', () => {
  it('22.gxh5 vs Rxf8+: the check, their reply, and the capture is still there', () => {
    expect(checksFirst(fen(), 'gxh5', 'Rxf8+', BEST_LINE)).toEqual({ best: 'Rxf8+', reply: 'Kxf8', played: 'gxh5' });
  });
  it('the still-wins verdict speaks the order, not "it would land a fork"', () => {
    const said = callInaccuracy({
      fenBefore: fen(), playedSan: 'gxh5', bestSan: 'Rxf8+', bestLineUci: BEST_LINE,
      cpLoss: 261, moverEvalAfterCp: 418, side: 'student', moverColor: 'white',
    } as never)?.said ?? '';
    expect(said).toBe("gxh5 still wins, but Rxf8+ was cleaner — checks first: Rxf8+, Kxf8, and gxh5 would still have been there — you'd have had both.");
  });
  it('negative controls: not a check, or the capture does not come back', () => {
    // The best move is not a check.
    expect(checksFirst(fen(), 'gxh5', 'Rd6', ['d8d6', 'g8h8', 'g4h5'])).toBeNull();
    // A check whose line never plays the student's capture.
    expect(checksFirst(fen(), 'gxh5', 'Rxf8+', ['d8f8', 'g8f8', 'e1g3', 'g7g6'])).toBeNull();
    // The line does not start with the best move — nothing is proved.
    expect(checksFirst(fen(), 'gxh5', 'Rxf8+', ['g4h5', 'g8f8'])).toBeNull();
  });
});
