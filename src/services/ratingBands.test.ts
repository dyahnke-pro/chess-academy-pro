import { describe, it, expect } from 'vitest';
import { coreRatingTier } from './ratingBands';

describe('coreRatingTier — the single teaching taxonomy', () => {
  it('bands at <1000 / 1000–2000 / >2000', () => {
    expect(coreRatingTier(600)).toBe('beginner');
    expect(coreRatingTier(999)).toBe('beginner');
    expect(coreRatingTier(1000)).toBe('intermediate');
    expect(coreRatingTier(1500)).toBe('intermediate');
    expect(coreRatingTier(2000)).toBe('intermediate');
    expect(coreRatingTier(2001)).toBe('advanced');
    expect(coreRatingTier(2400)).toBe('advanced');
  });

  it('defaults an unknown rating to intermediate (1200)', () => {
    expect(coreRatingTier(undefined)).toBe('intermediate');
    expect(coreRatingTier(null)).toBe('intermediate');
  });
});
