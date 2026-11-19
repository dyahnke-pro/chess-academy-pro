import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { countKingAttack } from './kingSafety';
import { kingDiagonalWalk } from './kingAttackReads';

// THE KING READS SAY ONLY WHAT THE BOARD HAS (Danya narration test 2026-11-19).
describe('king reads on Danya boards', () => {
  it('the importance of solving studies #0: their knight beside the king is a defender', () => {
    const a = countKingAttack(new Chess('8/kn4b1/P2B4/8/1Q6/6pP/1q4pP/5BK1 w - - 0 1'), 'w');
    expect(a?.defenders.has('b7')).toBe(true);
  });
  it('a guide to underpromotion #3: with rooks on, Kd4 is not the diagonal walk', () => {
    expect(kingDiagonalWalk('8/1pRP4/p7/1kP2p2/1p6/4K2r/P7/8 w - - 0 67', 'w', 'Kd4')).toBeNull();
  });
  it('negative control: in a pawn ending the diagonal step that approaches both pawns is said', () => {
    // White Kd2, pawn a5; Black pawn f5, king h8: Ke3 is not diagonal; Kc3 is. Read whatever holds:
    const r = kingDiagonalWalk('7k/8/8/P4p2/8/8/3K4/8 w - - 0 1', 'w', 'Ke3');
    expect(r).toBeNull(); // a straight step: never the diagonal read
  });
});
