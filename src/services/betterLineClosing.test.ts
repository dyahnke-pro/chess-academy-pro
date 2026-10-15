import { describe, it, expect } from 'vitest';
import { betterLineClosing } from './betterLineClosing';
import { mateEvalFor } from './engineConstants';

describe('the better line closes against the move played (review tape 2026-10-15)', () => {
  it('behind, but by how much less than the game move', () => {
    expect(betterLineClosing({ endsInMate: false, lineCp: -30, playedCp: -250 }))
      .toBe('That line still comes out behind, by a little — about two points better than the move played.');
  });
  it('no comparison when the gap is noise, the played eval is unknown, or a mate score', () => {
    expect(betterLineClosing({ endsInMate: false, lineCp: 120, playedCp: 100 })).toBe('That line comes out ahead by about a point.');
    expect(betterLineClosing({ endsInMate: false, lineCp: 120, playedCp: null })).toBe('That line comes out ahead by about a point.');
    expect(betterLineClosing({ endsInMate: false, lineCp: 120, playedCp: mateEvalFor(-3) })).toBe('That line comes out ahead by about a point.');
  });
  it('a mating line says so', () => {
    expect(betterLineClosing({ endsInMate: true, lineCp: 0, playedCp: 0 })).toBe('That line goes all the way to mate.');
  });
});
