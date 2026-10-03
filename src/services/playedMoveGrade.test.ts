import { describe, it, expect } from 'vitest';
import { gradePlayedMove } from './playedMoveGrade';

const line = (rank: number, evaluation: number, uci: string) => ({ rank, evaluation, moves: [uci], mate: null });

describe('gradePlayedMove — grade the played move from the paid-for fan', () => {
  // Italian, White to move after 1.e4 e5 2.Nf3 Nc6 3.Bc4. Fan: O-O best (+30),
  // Nxe5?? drops the knight (-250), d3 fine (+10).
  const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3';
  // Eval-descending, as Stockfish returns MultiPV: O-O best, d3 close 2nd, Nxe5 last.
  const analysisBefore = { bestMove: 'e1g1', topLines: [line(1, 30, 'e1g1'), line(2, 10, 'd2d3'), line(3, -250, 'f3e5')] };

  it('grades the best move as best — and stays silent (nothing to say)', () => {
    const g = gradePlayedMove({ fenBefore: FEN, playedUci: 'e1g1', fenAfter: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 4 3', analysisBefore, studentColor: 'w' })!;
    expect(g.reason).toBe('best');
    expect(g.worthSpeaking).toBe(false);
    expect(g.cpLossCp).toBe(0);
    expect(g.fault).toBe(false);
  });

  it('grades a blunder that hangs a piece as hung-piece, names it, and flags it a fault', () => {
    // After Nxe5, the knight on e5 hangs to ...Nxe5.
    const fenAfter = 'r1bqkbnr/pppp1ppp/2n5/4N3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 3';
    const g = gradePlayedMove({ fenBefore: FEN, playedUci: 'f3e5', fenAfter, analysisBefore, studentColor: 'w' })!;
    expect(g.reason).toBe('hung-piece');
    expect(g.cpLossCp).toBe(280);
    expect(g.worthSpeaking).toBe(true);
    expect(g.clause).toMatch(/hung the knight on e5/);
    expect(g.fault).toBe(true);
    expect(g.weaknessTag).toBe('reason:hung-piece');
  });

  it('returns null when the played move is outside the fan (defer to the faucet)', () => {
    expect(gradePlayedMove({ fenBefore: FEN, playedUci: 'h2h3', fenAfter: FEN, analysisBefore, studentColor: 'w' })).toBeNull();
  });

  it('returns null when there is no fan', () => {
    expect(gradePlayedMove({ fenBefore: FEN, playedUci: 'e1g1', fenAfter: FEN, analysisBefore: { bestMove: '', topLines: [] }, studentColor: 'w' })).toBeNull();
  });
});

// WO-OUTCOME-01 B: "that wins material" is what the capture NETS over its own
// engine line, never the captured piece's value — a trade wins nothing.
describe('gradePlayedMove — a capture is graded by what its line nets', () => {
  it('Bxc6 dxc6 is a trade, not "that wins material"', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6, White plays 4.Bxc6 — …dxc6 takes back.
    const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const after = 'r1bqkb1r/pppp1ppp/2B2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4';
    const g = gradePlayedMove({
      fenBefore: FEN, playedUci: 'b5c6', fenAfter: after, studentColor: 'w',
      analysisBefore: { bestMove: 'b5c6', topLines: [{ rank: 1, evaluation: 30, mate: null, moves: ['b5c6', 'd7c6', 'e1g1'] }, { rank: 2, evaluation: 20, mate: null, moves: ['e1g1'] }] },
    })!;
    expect(g.reason).not.toBe('wins-material');
  });
  it('a piece taken for nothing is "that wins material"', () => {
    // White's queen takes an undefended knight on h5 that threatens nothing
    // (positive control).
    const FEN = '4k3/8/8/7n/8/8/8/3QK3 w - - 0 1';
    const after = '4k3/8/8/7Q/8/8/8/4K3 b - - 0 1';
    const g = gradePlayedMove({
      fenBefore: FEN, playedUci: 'd1h5', fenAfter: after, studentColor: 'w',
      analysisBefore: { bestMove: 'd1h5', topLines: [{ rank: 1, evaluation: 900, mate: null, moves: ['d1h5', 'e8e7'] }, { rank: 2, evaluation: 890, mate: null, moves: ['d1d2'] }] },
    })!;
    expect(g.reason).toBe('wins-material');
  });
});
