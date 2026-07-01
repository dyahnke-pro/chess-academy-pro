import { describe, it, expect } from 'vitest';
import { safeRatingKey } from './ratingKey';
import { calculateRatingDelta } from '../services/puzzleService';

describe('safeRatingKey', () => {
  it('passes through a finite rating unchanged', () => {
    expect(safeRatingKey(900)).toBe(900);
    expect(safeRatingKey(0)).toBe(0);
    expect(safeRatingKey(2400)).toBe(2400);
  });

  it('collapses non-finite values to the fallback (default 1200)', () => {
    expect(safeRatingKey(NaN)).toBe(1200);
    expect(safeRatingKey(Infinity)).toBe(1200);
    expect(safeRatingKey(-Infinity)).toBe(1200);
    expect(safeRatingKey(undefined)).toBe(1200);
    expect(safeRatingKey(null)).toBe(1200);
  });

  it('honors a custom fallback', () => {
    expect(safeRatingKey(NaN, 100)).toBe(100);
  });
});

describe('calculateRatingDelta — never mints NaN', () => {
  it('returns 0 when either rating is non-finite (would poison the profile)', () => {
    expect(calculateRatingDelta(NaN, 1500, true)).toBe(0);
    expect(calculateRatingDelta(1200, NaN, true)).toBe(0);
    expect(calculateRatingDelta(NaN, NaN, false)).toBe(0);
  });

  it('still returns a finite delta for valid inputs', () => {
    const d = calculateRatingDelta(1200, 1500, true);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(0);
  });
});
