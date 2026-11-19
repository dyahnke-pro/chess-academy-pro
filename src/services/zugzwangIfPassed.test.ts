import { describe, expect, it } from 'vitest';
import { zugzwangIfPassed } from './zugzwangIfPassed';

// in-pursuit-of-zugzwang#0: "with Black to move it would be zugzwang:
// triangulate to lose a tempo".
const BOARD = '2k5/8/p1P5/P2K4/8/8/8/8 w - - 0 1';

describe('zugzwangIfPassed', () => {
  it('finds the zugzwang that is theirs only if they have to move', () => {
    const r = zugzwangIfPassed(BOARD, 'w');
    expect(r?.victim).toBe('b');
    expect(r?.drops).toBe(1);
    expect(r?.text).toContain('give them the move');
  });
  it('words it to the other seat', () => {
    expect(zugzwangIfPassed(BOARD, 'b')?.text).toContain("Don't let them hand you the move");
  });
  it('stays silent with pieces on, and on a plain race', () => {
    expect(zugzwangIfPassed('2k5/8/p1P5/P2K4/8/8/8/7R w - - 0 1', 'w')).toBeNull();
    expect(zugzwangIfPassed('8/8/8/4k3/8/8/P7/K7 w - - 0 1', 'w')).toBeNull();
  });
});
