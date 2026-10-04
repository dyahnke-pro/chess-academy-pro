import { describe, it, expect } from 'vitest';
import {
  studentPuzzleRating,
  puzzleTarget,
  puzzleLadder,
  DEFAULT_PUZZLE_RATING,
  DIFFICULTY_OFFSET,
} from './studentPuzzleRating';
import { STRETCH_SEED, MASTER_FLOOR, initReachState } from './reachRating';

describe('studentPuzzleRating — the one reader (D11, hand walk 2026-10-04)', () => {
  it('reads the profile puzzle rating', () => {
    expect(studentPuzzleRating({ puzzleRating: 1487 })).toBe(1487);
  });

  it('a missing or poisoned rating reads as the profile cold start, not the playing-strength default', () => {
    expect(studentPuzzleRating(null)).toBe(DEFAULT_PUZZLE_RATING);
    expect(studentPuzzleRating({})).toBe(DEFAULT_PUZZLE_RATING);
    expect(studentPuzzleRating({ puzzleRating: Number.NaN })).toBe(DEFAULT_PUZZLE_RATING);
  });

  it('the TARGET is the ladder, seeded a stretch above the rating — never shown as the rating', () => {
    const p = { puzzleRating: 800 };
    expect(puzzleTarget(p)).toBe(800 + STRETCH_SEED);
    expect(puzzleTarget(p)).not.toBe(studentPuzzleRating(p));
  });

  it('a persisted ladder wins over the seed', () => {
    const p = { puzzleRating: 800, preferences: { reachState: { ...initReachState(800), rating: 1333 } } };
    expect(puzzleTarget(p)).toBe(1333);
  });

  it('Master resolves to its elite ladder BEFORE a session — no 1500-then-2400 flip', () => {
    const p = { puzzleRating: 1500 };
    expect(puzzleLadder(p, { master: true }).rating).toBeGreaterThanOrEqual(MASTER_FLOOR);
    expect(puzzleTarget(p, { master: true })).toBe(MASTER_FLOOR);
  });

  it('the difficulty offset is what Easy / Medium / Hard serve', () => {
    const p = { puzzleRating: 1300 };
    const ladder = puzzleTarget(p);
    expect(puzzleTarget(p, { offset: DIFFICULTY_OFFSET.easy })).toBe(ladder - 200);
    expect(puzzleTarget(p, { offset: DIFFICULTY_OFFSET.medium })).toBe(ladder);
    expect(puzzleTarget(p, { offset: DIFFICULTY_OFFSET.hard })).toBe(ladder + 200);
  });
});
