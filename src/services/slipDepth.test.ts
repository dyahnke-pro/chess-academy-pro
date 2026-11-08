import { Chess } from 'chess.js';
import { describe, it, expect } from 'vitest';
import { refutationOf, howItFell, recurringFalls, mainConceptLine } from './slipDepth';

describe('slipDepth — how the punishment landed', () => {
  it('cuts the refutation where the cost lands, in the punisher\'s moves', () => {
    // A knight left on d5 is taken at once.
    const r = refutationOf('4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1', ['d1d5']);
    expect(r).not.toBeNull();
    expect(r?.moves).toBe(1);
    expect(r?.plies).toBe(1);
    expect(r?.mate).toBe(false);
    expect(r?.netPawns).toBe(3);
    expect(r?.quietStart).toBe(false);
    // A back-rank mate is a mate, one move deep.
    const m = refutationOf('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['a1a8']);
    expect(m?.mate).toBe(true);
    expect(m?.moves).toBe(1);
  });

  it('reads a quiet start on a real slip (7.Nc3?! …d4 forks, two moves to land)', () => {
    const r = refutationOf('r2qkb1r/ppp1ppp1/2n2n1p/3p3b/8/2NPBNPP/PPP1PPB1/R2QK2R b KQkq - 1 7', ['d5d4', 'e3d4', 'c6d4', 'g3g4', 'h5g6', 'f3e5']);
    expect(r).toMatchObject({ moves: 2, plies: 3, quietStart: true, mate: false, sans: ['d4', 'Bxd4', 'Nxd4'] });
  });

  it('claims no depth when the line proves no material and no mate', () => {
    expect(refutationOf('4k3/8/8/8/8/8/8/3QK3 w - - 0 1', ['d1d2'])).toBeNull();
    expect(refutationOf('4k3/8/8/8/8/8/8/3QK3 w - - 0 1', [])).toBeNull();
  });

  // Two of David's real slips (audit-reports/slip-reads, engine depth 12):
  // 7.Nc3?! …d4 and 7.Ne2?! …e4 — each a pawn move that takes nothing and
  // leaves two pieces under attack.
  const NC3 = { fenBefore: 'r2qkb1r/ppp1ppp1/2n2n1p/3p3b/8/3PBNPP/PPP1PPB1/RN1QK2R w KQkq - 0 7', san: 'Nc3', replyUci: ['d5d4', 'e3d4', 'c6d4', 'g3g4', 'h5g6', 'f3e5'] };
  const NE2 = { fenBefore: 'r1bqk1nr/1p3ppp/p1n5/2bpp3/5P2/3BP3/PPP3PP/RNBQK1NR w KQkq - 0 7', san: 'Ne2', replyUci: ['e5e4', 'd3e4', 'd5e4', 'd1d8', 'c6d8', 'b1d2'] };

  it('reads how a slip fell: a quiet threat, named off the board', () => {
    const after = (f: string, san: string): string => { const c = new Chess(f); c.move(san); return c.fen(); };
    const fall = howItFell(NC3.fenBefore, NC3.san, null, { fen: after(NC3.fenBefore, NC3.san), uci: NC3.replyUci });
    expect(fall?.kind).toBe('threat');
    expect(fall?.hit.map((h) => h.square).sort()).toEqual(['c3', 'e3']);
    expect(fall?.takenAt).toBe(2);
    expect(fall?.takenPiece).toBe('b');
  });

  it('names the game\'s recurring deep reason, for the student\'s seat first', () => {
    const moves = [{ seat: 'w' as const, ...NC3 }, { seat: 'w' as const, ...NE2 }];
    expect(recurringFalls(moves)).toEqual([{ seat: 'w', family: 'quiet-threat', sans: ['Nc3', 'Ne2'], firsts: ['d4', 'e4'] }]);
    expect(mainConceptLine(moves, 'w')).toBe('Two of your costly moves, Nc3 and Ne2, allowed a quiet threat that wins material. After your move, look for their threats, not only their captures.');
    expect(mainConceptLine(moves, 'b')).toBe('Two of their costly moves, Nc3 and Ne2, allowed a quiet threat that wins material.');
  });

  it('says nothing when no deep reason recurs', () => {
    expect(mainConceptLine([{ seat: 'w', ...NC3 }], 'w')).toBeNull();
    expect(mainConceptLine([{ seat: 'w', ...NC3, replyUci: null }, { seat: 'w', ...NE2, replyUci: null }], 'w')).toBeNull();
  });

  // David's game chesscom-143163794962, engine lines at depth 12
  // (audit-reports/slip-replies): 7.h3 and 8.Ne4 both let …Nf3+ uncover the
  // bishop on g7 onto the queen on d4; 14.Bxd7+ leaves …Kf8 as the answer.
  const H3 = { seat: 'w' as const, san: 'h3', fenBefore: 'r1bqk1nr/pp1pppbp/6p1/4n1N1/3Q4/8/PPP2PPP/RNB1KB1R w KQkq - 1 7', replyUci: ['e5f3', 'g5f3', 'g7d4', 'f3d4', 'd7d6', 'b1c3'] };
  const NE4 = { seat: 'w' as const, san: 'Ne4', fenBefore: 'r1bqk1nr/pp1pppb1/6pp/4n1N1/3Q4/7P/PPP2PP1/RNB1KB1R w KQkq - 0 8', replyUci: ['e5f3', 'g2f3', 'g7d4', 'c2c3', 'd4b6', 'a2a4'] };
  const BXD7 = { seat: 'w' as const, san: 'Bxd7+', fenBefore: 'r2qk1nr/p2bppb1/1p4pp/1BNp4/8/2P1BP1P/PP3P2/RN2K2R w KQkq - 2 14', replyUci: ['e8f8', 'c5e6', 'f7e6', 'd7b5', 'd5d4'] };

  it('a slip that gives check has a forced reply, never "a quiet move" of theirs (14.Bxd7+ …Kf8)', () => {
    const c = new Chess(BXD7.fenBefore); c.move(BXD7.san);
    const f = howItFell(BXD7.fenBefore, BXD7.san, null, { fen: c.fen(), uci: BXD7.replyUci });
    expect(f === null || (f.kind !== 'threat' && f.kind !== 'quiet')).toBe(true);
  });

  it('names the same shot when every slip allowed it (7.h3 and 8.Ne4 both allowed …Nf3+)', () => {
    expect(mainConceptLine([H3, NE4], 'w')).toBe('Two of your costly moves, h3 and Ne4, allowed the same shot, Nf3+, which wins material. After your move, play their checks and captures out until the board goes quiet.');
  });
});
