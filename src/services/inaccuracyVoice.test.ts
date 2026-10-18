import { describe, it, expect } from 'vitest';
import { tallyInaccuracies, inaccuracyVerdict, MIN_SLIPS } from './inaccuracyVoice';

type P = 'opening' | 'middlegame' | 'endgame';
const rows = (phase: P, small: number, big: number, tag = 'misplaced-piece') => [
  ...Array.from({ length: small }, () => ({ gamePhase: phase, grade: 'inaccuracy' as const, tag })),
  ...Array.from({ length: big }, () => ({ gamePhase: phase, grade: 'mistake' as const, tag })),
];

describe('inaccuracyVoice — the record decides, as personally as it can', () => {
  it("David's own numbers: opening speaks, middlegame and endgame stay quiet", () => {
    const rec = tallyInaccuracies([...rows('opening', 45, 28), ...rows('middlegame', 177, 198), ...rows('endgame', 59, 60)]);
    expect(inaccuracyVerdict(rec, 'opening', null).speaks).toBe(true);
    expect(inaccuracyVerdict(rec, 'middlegame', null).speaks).toBe(false);
    expect(inaccuracyVerdict(rec, 'endgame', null).speaks).toBe(false);
  });

  it('a skill they only ever leak small speaks, even in a phase they blunder in', () => {
    const rec = tallyInaccuracies([
      ...rows('middlegame', 10, 60, 'hung-material'),
      ...rows('middlegame', 8, 1, 'passive-rook'),
    ]);
    expect(inaccuracyVerdict(rec, 'middlegame', 'passive-rook')).toEqual({ speaks: true, level: 'skill' });
    expect(inaccuracyVerdict(rec, 'middlegame', 'hung-material')).toEqual({ speaks: false, level: 'skill' });
    // A skill with too few slips falls back to the phase.
    expect(inaccuracyVerdict(rec, 'middlegame', 'space-conceded')).toEqual({ speaks: false, level: 'phase' });
  });

  it('grey teaches: too few slips anywhere and the inaccuracy speaks', () => {
    expect(inaccuracyVerdict(tallyInaccuracies(rows('middlegame', 1, MIN_SLIPS - 2)), 'middlegame', 'misplaced-piece')).toEqual({ speaks: true, level: 'grey' });
    expect(inaccuracyVerdict(tallyInaccuracies([]), 'endgame', null).level).toBe('grey');
  });

  it('legacy rows with no grade count as big errors', () => {
    const rec = tallyInaccuracies([...rows('opening', 3, 0), ...Array.from({ length: 5 }, () => ({ gamePhase: 'opening' as const, tag: 'other' }))]);
    expect(inaccuracyVerdict(rec, 'opening', null).speaks).toBe(false);
  });
});
