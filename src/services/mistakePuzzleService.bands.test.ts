import { describe, it, expect } from 'vitest';
import { pvBandForRating } from './mistakePuzzleService';

/**
 * Boundary tests for the rating-banded PV-length picker.
 *
 * David's directive 2026-05-19: weaker players get 1-3 moves,
 * intermediate 4-6, advanced 6+. Boundaries are inclusive on the
 * upper edge:
 *   ≤1200 = beginner   (1-3)
 *    1201–1700 = intermediate (4-6)
 *   ≥1701 = advanced   (6+)
 *
 * The audit script can't easily exercise the band logic because it
 * lives behind a generation pipeline that needs Stockfish + a real
 * imported game. These pure-function tests catch accidental edits
 * to RATING_BANDS that would silently shift the boundaries.
 */
describe('pvBandForRating', () => {
  it('returns beginner band (1-3) for ratings up to and including 1200', () => {
    expect(pvBandForRating(0).label).toBe('beginner (1-3)');
    expect(pvBandForRating(800).label).toBe('beginner (1-3)');
    expect(pvBandForRating(1199).label).toBe('beginner (1-3)');
    expect(pvBandForRating(1200).label).toBe('beginner (1-3)');
  });

  it('returns intermediate band (4-6) for ratings 1201..1700', () => {
    expect(pvBandForRating(1201).label).toBe('intermediate (4-6)');
    expect(pvBandForRating(1450).label).toBe('intermediate (4-6)');
    expect(pvBandForRating(1699).label).toBe('intermediate (4-6)');
    expect(pvBandForRating(1700).label).toBe('intermediate (4-6)');
  });

  it('returns advanced band (6+) for ratings 1701 and above', () => {
    expect(pvBandForRating(1701).label).toBe('advanced (6+)');
    expect(pvBandForRating(2000).label).toBe('advanced (6+)');
    expect(pvBandForRating(2800).label).toBe('advanced (6+)');
    expect(pvBandForRating(Number.MAX_SAFE_INTEGER).label).toBe('advanced (6+)');
  });

  it('beginner band has min=1, max=3 (1-3 player moves)', () => {
    const band = pvBandForRating(1000);
    expect(band.min).toBe(1);
    expect(band.max).toBe(3);
  });

  it('intermediate band has min=4, max=6 (4-6 player moves)', () => {
    const band = pvBandForRating(1500);
    expect(band.min).toBe(4);
    expect(band.max).toBe(6);
  });

  it('advanced band has min=6, max=10 (6+ player moves)', () => {
    const band = pvBandForRating(2200);
    expect(band.min).toBe(6);
    expect(band.max).toBe(10);
  });

  it('returns SAME band reference for ratings within the same band (idempotent picker)', () => {
    const a = pvBandForRating(1300);
    const b = pvBandForRating(1500);
    expect(a).toBe(b);
  });

  it('negative ratings fall into the beginner band (defensive bound)', () => {
    expect(pvBandForRating(-100).label).toBe('beginner (1-3)');
  });
});
