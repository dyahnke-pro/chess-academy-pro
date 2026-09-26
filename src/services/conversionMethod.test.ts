// WO-LAYERS-01 step 5 — the one conversion step the board is on.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readConversion } from './conversionMethod';

describe('readConversion', () => {
  it('not a piece up → no method (an edge is not a won game)', () => {
    expect(readConversion('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'w')).toBeNull();
  });

  it('a piece up with the minors still home → finish developing first', () => {
    // White has an extra knight; both bishops and a knight unmoved, king uncastled.
    const r = readConversion('r1bqkb1r/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5', 'w');
    expect(r?.step).toBe('finish-development');
    expect(r?.text).toMatch(/finish developing/);
  });

  it('a piece up, castled and developed, pieces left on → trade pieces, not pawns', () => {
    const r = readConversion('r4rk1/ppp2ppp/2n5/3q4/3P4/2N2N2/PP3PPP/R2Q1RK1 w - - 0 15', 'w');
    expect(r?.step).toBe('trade-pieces');
  });

  it('few pieces left and no passer → make one', () => {
    const r = readConversion('6k1/5ppp/8/8/8/8/1B3PPP/2R3K1 w - - 0 40', 'w');
    expect(r?.step).toBe('make-passer');
  });

  it('a passer on the board → escort it, and it names the square', () => {
    const r = readConversion('2r3k1/6pp/8/1P6/8/8/1B3PPP/2R3K1 w - - 0 40', 'w');
    expect(r?.step).toBe('escort-passer');
    expect(r?.text).toMatch(/b5/);
  });

  it('a lone king → cut it off, with the heavy piece the student actually has', () => {
    const r = readConversion('8/8/8/4k3/8/8/8/4K2Q w - - 0 60', 'w');
    expect(r?.step).toBe('cut-off-king');
    expect(r?.text).toMatch(/your queen/);
  });

  it('reads from the student seat: the same board is nothing for the side behind', () => {
    expect(readConversion('8/8/8/4k3/8/8/8/4K2Q w - - 0 60', 'b')).toBeNull();
  });

  it('counts SETTLED material, never mid-exchange (1380 re-walk, 13.Rxd8 Qe7)', () => {
    // The rook on d8 is about to be taken back by the queen; the knight on h5
    // hangs to gxh5. On the board White is "a rook up"; settled, it is a piece.
    const c = new Chess();
    for (const m of 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3 Rxf3 Rd8 g4 f5 Rxd8 Qe7'.split(' ')) c.move(m);
    expect(readConversion(c.fen(), 'w')?.text ?? '').not.toMatch(/a rook up/);
  });
});
