// After 13.Nxe5 (question walk 2026-09-27) the coach said "You'd love to play
// the natural move with the knight to e4 — but they answer Nf3 and it falls
// apart" while the knight on e5 waited to be taken back. With the best move a
// free recapture, no quiet move is tempting.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { temptingFromAnalysis } from './tacticalRead';

const c = new Chess();
for (const s of 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5'.split(' ')) c.move(s);
const FEN = c.fen(); // Black to move; White pieces-up evals are White POV

describe('a tempting move has to out-appeal the best move', () => {
  it('best is the recapture dxe5 → Ne4 is not "tempting"', () => {
    const t = temptingFromAnalysis(FEN, [
      { moves: ['d6e5'], evaluation: 50 },
      { moves: ['f6e4', 'e5f3'], evaluation: 350 },
    ], 'black');
    expect(t).toBeNull();
  });
  it('a capture that out-appeals a quiet best move still is (negative control)', () => {
    const t = temptingFromAnalysis(FEN, [
      { moves: ['c7b6'], evaluation: 50 },
      { moves: ['d6e5', 'b2e5'], evaluation: 400 },
    ], 'black');
    expect(t?.san).toBe('dxe5');
  });
});
