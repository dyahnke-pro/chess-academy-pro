import { describe, expect, it } from 'vitest';
import { studentOutpacesOpponentBuild } from './coachFeatureService';
import { MATE_EVAL_VALUE } from './engineConstants';

// Review of chesscom-1040709576 (2026-10-13): "Watch what they're building"
// was spoken on a ply where the student (Black) had a forced mate.
describe('the opponent\'s "left alone" idea is held when the student goes first and wins', () => {
  it('a student with a forced mate outpaces any opponent build', () => {
    expect(studentOutpacesOpponentBuild(-MATE_EVAL_VALUE + 5, 'b', true)).toBe(true);
    expect(studentOutpacesOpponentBuild(MATE_EVAL_VALUE - 5, 'w', false)).toBe(true);
  });
  it('a student already decided-winning outruns a non-mating idea', () => {
    expect(studentOutpacesOpponentBuild(-900, 'b', false)).toBe(true);
  });
  it('a MATE threat against a merely-winning student is still said', () => {
    expect(studentOutpacesOpponentBuild(-900, 'b', true)).toBe(false);
  });
  it('a contested or losing position keeps the call-out', () => {
    expect(studentOutpacesOpponentBuild(-150, 'b', false)).toBe(false);
    expect(studentOutpacesOpponentBuild(900, 'b', false)).toBe(false);
    expect(studentOutpacesOpponentBuild(null, 'b', false)).toBe(false);
  });
});

describe('the mating ply names its mate (2026-10-13)', () => {
  it('a back-rank mate is named and explained from the board', async () => {
    const { mateDescription } = await import('./matePatterns');
    const d = mateDescription('R5k1/5ppp/8/8/8/8/8/6K1 b - - 1 1');
    expect(d).toMatch(/Back-Rank Mate/);
    expect(d).toMatch(/rook on a8 checks the king on g8/);
  });
  it('a board that is not mate says nothing', async () => {
    const { mateDescription } = await import('./matePatterns');
    expect(mateDescription('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1')).toBeNull();
  });
});
