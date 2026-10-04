import { describe, expect, it } from 'vitest';
import { proofCut, lineGiftIndex } from './exchangeLedger';
import { punishmentOf } from './inaccuracyCall';

// Clean-pass walk 2026-10-03, G1 ply 29: "Ba2 was a mistake — it let them win
// a pawn … …Nge7 Be3 …Qb7 axb4 …Qxb4 c4 …dxc4 — they come out a pawn up."
// c4 was White's own pawn sac (the engine's line goes on Qd6); Ba2 let them
// win nothing.
const F = 'r3k1nr/5ppp/1qn1p3/3pPb2/pp3B2/PB3N2/1PP2PPP/R2Q1RK1 w kq - 0 15';
const LINE = ['g8e7', 'f4e3', 'b6b7', 'a3b4', 'b7b4', 'c2c4', 'd5c4'];

describe('material the loser gives away is not material won', () => {
  it('a quiet pawn sac inside the reply line proves no win', () => {
    expect(proofCut(F, ['Ba2', 'Nge7', 'Be3', 'Qb7', 'axb4', 'Qxb4', 'c4', 'dxc4'], 'w')).toBeNull();
    expect(punishmentOf(F, 'Ba2', LINE, 'white')).toBeNull();
  });
  it('an offered trade the giver takes back is not a gift', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Nd5 Nxd5 5.exd5 — knights traded.
    expect(lineGiftIndex('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Nd5', 'Nxd5', 'exd5'], 'w')).toBe(-1);
  });
  it('the judged first move walking into a capture is the cost, not a gift', () => {
    // After 1.e4 e5 2.Nf3?? d5 — the judged move Qg4 hangs the queen to Bxg4.
    const fen = 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3';
    expect(lineGiftIndex(fen, ['Qg4', 'Bxg4'], 'w')).toBe(-1);
  });
  it('a gift later in the line cuts the proof before it, never voids what came first', () => {
    // Qg4?? Bxg4 Bc4 dxc4: the queen is lost; the bishop sac after it is not the point.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const p = proofCut(fen, ['Qg4', 'Bxg4', 'Bc4', 'dxc4'], 'w');
    expect(p?.ledger?.opponentWon).toEqual(['q']);
  });
  it('a pawn that was safe when it moved and left hanging later is no gift', () => {
    expect(lineGiftIndex('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6'], 'b')).toBe(-1);
  });
});

// Clean-pass re-walk 2026-10-04, G1 26.Rac1: "That let them win a piece for
// two pawns, starting with h6" — the reply line was …h6 Bxd5 exd5 Qxd5, White
// giving its own bishop for two pawns at +6.7.
describe('a losing capture by the side that ends behind is a gift', () => {
  it('Rac1 h6 Bxd5 exd5 Qxd5 proves nothing against Rac1', () => {
    const F = 'Q2n1k1r/2R3pp/4pq2/3p1b2/8/P4N2/B4PPP/R5K1 w - - 1 26';
    const p = proofCut(F, ['Rac1', 'h6', 'Bxd5', 'exd5', 'Qxd5'], 'w');
    expect(p?.ledger?.opponentWon ?? []).not.toContain('b');
  });
});

// Positive control, clean-pass re-walk 2026-10-04, G3 27…Ne7: "That let them
// win a piece for two pawns, starting with f5+" is TRUE — …Nxf5 answers the
// check, it is not a gift.
describe('a capture forced by check is no gift', () => {
  it('Ne7 f5+ Nxf5 gxf5+ Kxf5 still proves the piece', () => {
    const F = '3r4/p2r1pp1/1p2k2p/2p1Pn2/4NPP1/P7/1B5P/4RK2 b - - 0 27';
    expect(proofCut(F, ['Ne7', 'f5+', 'Nxf5', 'gxf5+', 'Kxf5'], 'b')?.ledger?.opponentWon).toContain('n');
    expect(lineGiftIndex(F, ['Ne7', 'f5+', 'Nxf5', 'gxf5+', 'Kxf5'], 'b')).toBe(-1);
  });
});
