import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { compensation } from './compensation';

const QUIET = ['g8f6'];
const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('compensation — down material and still fine, with what pays for it', () => {
  it('the Danish: two pawns down after 5.Bxb2, level, two pieces ahead in development', () => {
    const fen = after('e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2');
    expect(compensation(fen, 'w', 0, QUIET)?.text).toBe("You're two pawns down, but it is about level: you're two pieces ahead in development.");
  });

  it('said from the other seat when it is their compensation', () => {
    const fen = after('e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2');
    expect(compensation(fen, 'b', 0, QUIET)?.text).toBe("They're two pawns down, but it is about level: they're two pieces ahead in development.");
  });

  it('says nothing when the side down material is simply worse', () => {
    const fen = after('e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2');
    expect(compensation(fen, 'w', -180, QUIET)).toBeNull();
  });

  it('says nothing with no board reason (the King\'s Gambit after 3.Nf3: one piece out, nothing else)', () => {
    expect(compensation(after('e4', 'e5', 'f4', 'exf4', 'Nf3'), 'w', -30, QUIET)).toBeNull();
  });

  it('says nothing when material is level', () => {
    expect(compensation(after('e4', 'e5', 'Nf3'), 'w', 30, QUIET)).toBeNull();
  });

  it('says nothing while the trade is still going: the line goes on with a check or a capture', () => {
    const fen = after('e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2');
    expect(compensation(fen, 'w', 0, ['f8b4'])).toBeNull(); // …Bb4+ next
    expect(compensation(fen, 'w', 0, [])).toBeNull(); // no line, no read
  });
});

// Blind grade 2026-11-13: the quiet count took the capture on offer, so a
// level board was "a pawn down" (Ruy, after O-O: …Nxe4 on offer). A real
// two-pawn deficit on the board (Open Ruy after Re1) is still said.
describe('down is what the board and the quiet count agree on', () => {
  it('a level board after O-O in the Ruy is not a pawn down', () => {
    const a = compensation('r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 3 5', 'w', 0, ['f8e7']);
    expect(a?.text ?? '').not.toMatch(/down/);
  });
  it('two pawns down on the board is still said as two', () => {
    const a = compensation('r1bqkb1r/1ppp1ppp/p1n5/8/B2pn3/5N2/PPP2PPP/RNBQR1K1 b kq - 1 7', 'w', 60, ['d7d5']);
    expect(a?.text).toMatch(/^You're two pawns down/);
  });
});
