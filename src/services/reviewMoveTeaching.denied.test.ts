import { describe, it, expect } from 'vitest';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';

describe('a covered square says whose square it takes (review audit 2026-10-14: "The pawn now covers b4 in their half.")', () => {
  it('names the enemy piece the square is taken from', () => {
    // White pushes a4-a5: b6 is now covered, and the knight on d7 wanted it.
    const fen = 'r1bqkb1r/pppn1ppp/4pn2/3p4/P2P4/2N2N2/1PP1PPPP/R1BQKB1R w KQkq - 0 5';
    const out = buildReviewMoveTeaching(fen, 'a5', true);
    expect(out).toBe('The pawn takes b6 away from their knight on d7.');
  });
  it('never says a bare "covers … in their half"', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    for (const san of ['a4', 'h4', 'Nh3', 'Na3']) {
      expect(buildReviewMoveTeaching(fen, san, true) ?? '').not.toMatch(/in (their|your) half/);
    }
  });
});
