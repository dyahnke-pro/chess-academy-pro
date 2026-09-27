// THE THREAT AND THE MOVE THAT MEETS IT (2026-09-27, corpus comparison): when
// the best move answers the opponent's threat, its reason says so.
import { describe, it, expect } from 'vitest';
import { moveWhy, threatAnswerWhy } from './deliberation';

describe('threatAnswerWhy', () => {
  it('a move that breaks a pin to the king says so', () => {
    const fen = 'r1b1k2r/ppp2ppp/2n2q2/3pp3/1b1P4/2N1PN2/PPP2PPP/R1BQKB1R w KQkq - 0 7';
    expect(moveWhy(fen, 'Bd2', 'w', null)).toBe('breaks the pin on the knight on c3');
  });
  it('a move that guards a piece they were winning says so', () => {
    const fen = 'r1bqkbnr/pppp1ppp/8/8/3nP3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 3';
    expect(moveWhy(fen, 'c5', 'b', null)).toBe('guards the knight on d4, which they were about to win');
  });
  it('NEGATIVE: the moved piece stepping away is "out of reach", not a guard', () => {
    const fen = 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4';
    expect(threatAnswerWhy(fen, 'Nf3', 'w')).toBeNull();
    expect(moveWhy(fen, 'Nf3', 'w', null)).toMatch(/out of the pawn's reach/);
  });
  it('NEGATIVE: a quiet move with no threat on the board is not an answer', () => {
    expect(threatAnswerWhy('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'e5', 'b')).toBeNull();
  });
});
