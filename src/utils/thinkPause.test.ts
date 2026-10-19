import { describe, it, expect } from 'vitest';
import { askThenAnswer, splitThink, stripThink, THINK_MARK } from './thinkPause';

describe('thinkPause', () => {
  it('splits a question from its answer', () => {
    expect(splitThink(`What do you do about it? ${THINK_MARK} Take it — Bxd1 removes the queen.`))
      .toEqual(['What do you do about it?', 'Take it — Bxd1 removes the queen.']);
  });
  it('null without a mark', () => { expect(splitThink('Take it.')).toBeNull(); });
  it('strips the mark for display', () => {
    expect(stripThink(`Watch out. What now? ${THINK_MARK} Take it.`)).toBe('Watch out. What now? Take it.');
  });
  it('only the closed answer waits — the sentences after it are said now (prod walk 2026-10-19)', () => {
    const turn = `${askThenAnswer('How do you meet it?', 'Step out of it — take the queen off the line.')} Nxc6 was one of just two moves that kept the win here.`;
    expect(splitThink(turn)).toEqual([
      'How do you meet it? Nxc6 was one of just two moves that kept the win here.',
      'Step out of it — take the queen off the line.',
    ]);
    expect(stripThink(turn)).toBe('How do you meet it? Step out of it — take the queen off the line. Nxc6 was one of just two moves that kept the win here.');
  });
});
