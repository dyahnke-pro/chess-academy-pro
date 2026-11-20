// THE WHY BEHIND A TRY'S MATERIAL (2026-11-20, step 3 on the 29 puzzle reads):
// a try refuted only by "they win a rook" says HOW the material falls, from
// the computer that already reads a move that drops material (`whyItFailed`)
// and the piece the try leaves hanging (`captureRead`).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { tryLossMechanism } from './weighedMoves';

const mv = (fen: string, san: string) => new Chess(fen).move(san);

describe('how a try loses its material', () => {
  it('0Km5u Kh8 board: …Rf7 blocks the check but leaves the rook on b8 to the knight', () => {
    const fen = '1rb2rk1/6pp/1qNp4/1p1Qppb1/4P3/2P5/1P3PPP/R3KB1R b KQ - 3 18';
    const t = tryLossMechanism(fen, mv(fen, 'Rf7'), ['f8f7', 'c6b8', 'f5e4', 'f1e2', 'b6f2', 'e1d1'], 'b');
    expect(t).toBe('It does nothing for your rook on b8, which their knight still takes.');
  });
  it('0Km5u Rd8 board: …Kg8 leaves the bishop on d7 to the queen (taken after h4 …Bf4)', () => {
    const fen = '5r1k/3b2pp/3Q4/1p2p1b1/4p3/2P1q3/1P2B1PP/R2K3R b - - 0 23';
    const t = tryLossMechanism(fen, mv(fen, 'Kg8'), ['h8g8', 'h2h4', 'g5f4', 'd6d7', 'g8h8'], 'b');
    expect(t).toBe('It does nothing for your light-squared bishop, which their queen still takes.');
  });
  it('NEGATIVE CONTROL: a try whose line takes nothing the try left reads no loss', () => {
    const fen = '2b2r1k/3N2pp/3p4/1p1Qp1b1/4p3/2P1q3/1P2B1PP/R2K3R b - - 3 22';
    expect(tryLossMechanism(fen, mv(fen, 'Rf2'), ['f8f2', 'h1e1', 'h7h5', 'd5d6'], 'b')).toBeNull();
  });
});
