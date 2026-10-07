import { describe, it, expect } from 'vitest';
import { findTiedDefenders, newTiedDefender, tiedDefenderLine } from './tiedDefender';

describe('tiedDefender — the guard that cannot leave', () => {
  // Black pawn e5, guarded only by the knight on d7. Re1 puts it under fire.
  const before = '4k3/3n4/8/4p3/8/8/8/R5NK w - - 0 1';
  const after = '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1';

  it('the guard holds the pawn; lift it and the pawn falls', () => {
    const t = findTiedDefenders(after, 'w');
    expect(t[0]?.defender.square).toBe('d7');
    expect(t[0]?.target.square).toBe('e5');
  });

  it('the move that created the tie is the event, said with its count', () => {
    const t = newTiedDefender(before, after, 'w');
    expect(tiedDefenderLine(t!)).toBe('Their knight on d7 is tied down now: you hit the pawn on e5 once and it is guarded once — take the knight away and it falls. That is what pressure buys — a piece that cannot leave.');
  });

  it('no pressure, no tie; a loose piece is a hanging piece, not a tie', () => {
    expect(newTiedDefender(before, before, 'w')).toBeNull();
    expect(findTiedDefenders('4k3/8/8/4p3/8/8/8/4R1NK w - - 0 1', 'w')).toEqual([]);
  });
});
