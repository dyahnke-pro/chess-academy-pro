import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { settledBalance, settledLeadFor, lastMoveOf, lastMoveFromUci } from './material';

const play = (sans: string): Chess => {
  const c = new Chess();
  for (const s of sans.split(/\s+/).filter(Boolean)) c.move(s);
  return c;
};

describe('material — the one settled count', () => {
  it('mid-recapture is level, not a piece up (Nxf6+ with Bxf6 coming)', () => {
    const c = play('d4 Nf6 c4 e6 Nc3 d5 Bg5 Be7 Nf3 O-O e3 h6 Bxf6');
    expect(settledLeadFor(c.fen(), 'w', lastMoveOf(c))).toBe(0);
  });

  it('a free capture keeps the raw count', () => {
    const c = play('e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5');  // nothing can retake on e5
    expect(settledBalance(c.fen(), lastMoveOf(c))).toBe(1);
  });

  it('a null last move is the raw count, in writing', () => {
    const c = play('e4 d5 exd5');
    expect(settledBalance(c.fen(), null)).toBe(1);
    expect(settledBalance(c.fen(), lastMoveOf(c))).toBe(0);  // Qxd5 retakes
  });

  it('a pinned recapturer does not retake (legal SEE, not geometric)', () => {
    // Bxf6 just took a knight; g7xf6 is illegal — the g-pawn is pinned by Rg1.
    const fen = '6k1/6p1/5B2/8/8/8/8/6RK b - - 0 1';
    expect(settledBalance(fen, { to: 'f6', captured: 'n' })).toBe(7);
  });

  it('reads a UCI move as a capture or not', () => {
    const fen = new Chess().fen();
    expect(lastMoveFromUci(fen, 'e2e4')).toEqual({ to: 'e4', captured: null });
    expect(lastMoveFromUci(fen, 'e2e5')).toBeNull();
  });
});
