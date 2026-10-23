import { describe, expect, it } from 'vitest';
import { ownTakebackPlies, sideToMoveOf } from './takebackPlies';

describe('the student\'s own takeback lands on their turn (David 2026-10-23: "I can\'t move the pieces")', () => {
  it('White student: your move, the coach to reply → take back 1', () => {
    expect(ownTakebackPlies(1, 'b', 'w')).toBe(1);
  });
  it('White student: the coach replied → take back 2, never the coach\'s reply alone', () => {
    expect(ownTakebackPlies(2, 'w', 'w')).toBe(2);
    expect(ownTakebackPlies(40, 'w', 'w')).toBe(2);
  });
  it('Black student: the coach opened and you have not moved → nothing to take back', () => {
    expect(ownTakebackPlies(1, 'b', 'b')).toBe(0);
    expect(ownTakebackPlies(0, 'w', 'w')).toBe(0);
  });
  it('Black student: your move answered → 2; your move unanswered → 1', () => {
    expect(ownTakebackPlies(3, 'b', 'b')).toBe(2);
    expect(ownTakebackPlies(2, 'w', 'b')).toBe(1);
  });
  it('reads the side to move off a FEN', () => {
    expect(sideToMoveOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe('b');
    expect(sideToMoveOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('w');
  });
});
