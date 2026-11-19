import { describe, expect, it } from 'vitest';
import { kingRace } from './kingRace';

// The study (the-importance-of-solving-studies#2): "everything hinges on whether White's king
// reaches g7 (to escort the h-pawn) before Black's king can".
const STUDY = 'k7/8/4p3/7P/8/3P4/1Bb4P/K7 w - - 0 1';

describe('kingRace', () => {
  it('counts both kings to g7, the h-pawn\'s escort square', () => {
    const r = kingRace(STUDY, 'w');
    expect(r?.escort).toBe('g7');
    expect(r?.pawn).toBe('h5');
    expect([r?.mine, r?.theirs]).toEqual([7, 6]);
    expect(r?.text).toContain('king race to g7');
  });
  it('stays silent with queens on, and when one king is far ahead', () => {
    expect(kingRace('k6q/8/4p3/7P/8/3P4/1Bb4P/K6Q w - - 0 1', 'w')).toBeNull();
    expect(kingRace('k7/8/4p1K1/7P/8/3P4/1Bb4P/8 w - - 0 1', 'w')).toBeNull();
  });
});
