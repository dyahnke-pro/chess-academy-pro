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

describe('compensation: the initiative pays (WO-DANYA-READS-01 #2)', () => {
  it('a piece for a pawn down after the Fried Liver sacrifice, and White\'s moves keep hitting the king', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 Kxf7 7.Qf3+ Ke6 —
    // +0.82 for White at depth 16. The line handed in is a legal line with a
    // threat and two checks for White and none for Black (the computer reads
    // whatever line it is handed).
    const fen = 'r1bq1b1r/ppp3pp/2n1k3/3np3/2B5/5Q2/PPPP1PPP/RNB1K2R w KQ - 2 8';
    const a = compensation(fen, 'w', 82, 'b1c3 c6e7 f3f7 e6d6 c3e4 d6c6'.split(' '));
    // The deficit is named by its pieces, not counted as "two pawns".
    expect(a?.text).toBe("They're up material: a piece for a pawn, but you're slightly better: you have the initiative.");
  });
});

describe('compensation: a king in the corner is castled (Danya, mastering the queen sacrifice #2)', () => {
  const fen = 'r1b1k2r/ppppnpp1/4p2p/2bqP3/2N1NP2/2PB4/P3Q1PP/R4R1K b kq - 0 16';
  it('White two pawns down, king on h1, theirs on e8: the king in the middle pays', () => {
    // Stockfish depth 16: −0.36 for White, Black's best b6 (a quiet move).
    const a = compensation(fen, 'b', 36, 'b7b6 c4d2 a8b8 e4g3'.split(' '));
    expect(a?.text).toBe("They're two pawns down, but it is about level: your king is still in the middle.");
  });
  it('a king that never castled is not castled: on f1 the middle king pays nothing', () => {
    const f1 = 'r1b1k2r/ppppnpp1/4p2p/2bqP3/2N1NP2/2PB4/P3Q1PP/R4K1R b kq - 0 16';
    expect(compensation(f1, 'b', 36, 'b7b6 c4d2 a8b8 e4g3'.split(' '))).toBeNull();
  });
});
