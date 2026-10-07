import { describe, it, expect } from 'vitest';
import { lookAt } from './criticalMoment';
import { turningQuestion } from './turningPoints';

describe('52-errors #43–46: a verdict says what to look at', () => {
  it('#43 "two moves keep the win" says which pieces, never the moves', () => {
    expect(lookAt(['Nf5', 'Nd5'])).toBe(' Both are knight moves.');
    expect(lookAt(['Rxe7', 'Qh5'])).toBe(' Look at your rook and your queen.');
    expect(lookAt([])).toBe('');
  });

  it('#46 a hanging piece is the turning question, not a bare "Find the move."', () => {
    expect(turningQuestion({ id: 'hung:b', kind: 'hung', tactic: null, piece: 'b' })).toBe('This is where the game turned. Your bishop was left hanging — find the move that keeps it.');
  });
});
