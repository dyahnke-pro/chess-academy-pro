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
