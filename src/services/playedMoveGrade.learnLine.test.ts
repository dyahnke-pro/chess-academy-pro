import { describe, expect, it } from 'vitest';
import { learnGradeLine } from './playedMoveGrade';
import { moveReasonClause } from './moveReason';

describe('learnGradeLine — Learn grades the move as "your move", never by name', () => {
  it('a fault clause takes "your move" as its subject', () => {
    expect(learnGradeLine('It let them take your rook on h8.')).toBe('Your move let them take your rook on h8.');
  });
  it('every merit clause reads as a sentence about your move', () => {
    for (const r of ['only-move', 'clear-best', 'defends-threat', 'wins-material', 'best', 'solid'] as const) {
      const c = moveReasonClause(r);
      const line = learnGradeLine(c);
      expect(line.startsWith('Your move')).toBe(true);
      expect(line).not.toMatch(/^[A-Z][a-h]?x?[a-h][1-8]/);
    }
    expect(learnGradeLine('that meets the threat.')).toBe('Your move meets the threat.');
    expect(learnGradeLine('the only move that holds here.')).toBe('Your move was the only move that holds here.');
  });
});
