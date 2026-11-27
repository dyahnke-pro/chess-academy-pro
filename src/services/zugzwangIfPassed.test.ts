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

// THE RACE BOARDS (2026-11-26): the full minimax spent ~4 s on each of these
// in a review's endgame read (reviewFullData's race test timed out). The
// windowed search gives the same verdicts (recorded from the full search) in
// a fraction of the time.
describe('zugzwangIfPassed — the race boards', () => {
  const SAME: Array<[string, { victim: string; drops: number; plies: number } | null]> = [
    ['2k5/8/p1P5/P2K4/8/8/8/8 w - - 0 1', { victim: 'b', drops: 1, plies: 8 }],
    ['2k5/8/p1P5/P2K4/8/8/8/8 b - - 0 1', null],
    ['8/8/4k3/8/4PK2/8/8/8 w - - 0 1', null],
    ['8/8/1p6/1Pk5/8/2K5/8/8 w - - 0 1', null],
    ['8/pp6/8/PP6/8/k7/8/K7 w - - 0 1', null],
    ['7k/6p1/8/4P3/3p4/8/6P1/6K1 w - - 0 27', null],
  ];
  it('the same verdicts as the full search, fast', () => {
    const start = Date.now();
    for (const [fen, want] of SAME) {
      const r = zugzwangIfPassed(fen, 'w');
      expect(r ? { victim: r.victim, drops: r.drops, plies: r.plies } : null).toEqual(want);
    }
    expect(Date.now() - start).toBeLessThan(1500);
  });
});
