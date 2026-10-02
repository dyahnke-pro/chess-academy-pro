import { describe, it, expect } from 'vitest';
import { splitThink, stripThink, THINK_MARK } from './thinkPause';

describe('thinkPause', () => {
  it('splits a question from its answer', () => {
    expect(splitThink(`What do you do about it? ${THINK_MARK} Take it — Bxd1 removes the queen.`))
      .toEqual(['What do you do about it?', 'Take it — Bxd1 removes the queen.']);
  });
  it('null without a mark', () => { expect(splitThink('Take it.')).toBeNull(); });
  it('strips the mark for display', () => {
    expect(stripThink(`Watch out. What now? ${THINK_MARK} Take it.`)).toBe('Watch out. What now? Take it.');
  });
});
