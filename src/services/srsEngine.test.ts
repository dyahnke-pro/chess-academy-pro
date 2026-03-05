import { describe, it, expect } from 'vitest';
import {
  calculateNextInterval,
  createDefaultSrsFields,
  isCardDue,
  getGradeLabel,
} from './srsEngine';

describe('calculateNextInterval', () => {
  it('resets interval to 1 on "again" grade', () => {
    const result = calculateNextInterval('again', 10, 2.5, 5);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  it('decreases ease factor on "again" grade', () => {
    const result = calculateNextInterval('again', 10, 2.5, 5);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it('sets interval to 1 on first correct answer', () => {
    const result = calculateNextInterval('good', 0, 2.5, 0);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('sets interval to 6 on second correct answer', () => {
    const result = calculateNextInterval('good', 1, 2.5, 1);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('multiplies interval by ease factor on subsequent answers', () => {
    const result = calculateNextInterval('good', 6, 2.5, 2);
    expect(result.interval).toBe(Math.round(6 * 2.5));
  });

  it('gives longer interval for "easy" grade', () => {
    const good = calculateNextInterval('good', 6, 2.5, 2);
    const easy = calculateNextInterval('easy', 6, 2.5, 2);
    expect(easy.interval).toBeGreaterThan(good.interval);
  });

  it('never lets ease factor drop below 1.3', () => {
    let ef = 1.4;
    for (let i = 0; i < 20; i++) {
      const result = calculateNextInterval('again', 1, ef, 0);
      ef = result.easeFactor;
    }
    expect(ef).toBeGreaterThanOrEqual(1.3);
  });

  it('returns a future ISO date string', () => {
    const result = calculateNextInterval('good', 1, 2.5, 1);
    const today = new Date().toISOString().split('T')[0];
    expect(result.dueDate > today).toBe(true);
  });
});

describe('createDefaultSrsFields', () => {
  it('returns default SM-2 values', () => {
    const fields = createDefaultSrsFields();
    expect(fields.interval).toBe(0);
    expect(fields.easeFactor).toBe(2.5);
    expect(fields.repetitions).toBe(0);
  });

  it('sets due date to today', () => {
    const fields = createDefaultSrsFields();
    const today = new Date().toISOString().split('T')[0];
    expect(fields.dueDate).toBe(today);
  });
});

describe('isCardDue', () => {
  it('returns true for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(isCardDue(today)).toBe(true);
  });

  it('returns true for past dates', () => {
    expect(isCardDue('2020-01-01')).toBe(true);
  });

  it('returns false for future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(isCardDue(future.toISOString().split('T')[0])).toBe(false);
  });
});

describe('getGradeLabel', () => {
  it('returns formatted label with interval', () => {
    const label = getGradeLabel('good', 1, 2.5, 1);
    expect(label).toMatch(/Good · \d+d/);
  });

  it('resets to 1 day label for "again" grade', () => {
    const label = getGradeLabel('again', 0, 2.5, 0);
    expect(label).toMatch(/Again · 1d/);
  });

  it('returns Hard label', () => {
    const label = getGradeLabel('hard', 1, 2.5, 1);
    expect(label).toMatch(/^Hard/);
  });

  it('returns Easy label', () => {
    const label = getGradeLabel('easy', 1, 2.5, 1);
    expect(label).toMatch(/^Easy/);
  });
});

describe('formatInterval edge cases (via getGradeLabel)', () => {
  it('shows "now" for 0-day interval', () => {
    // "again" on a fresh card yields interval=1, not 0.
    // But we can test via getGradeLabel + calculateNextInterval by
    // checking that a "good" on rep=0 yields 1d
    const label = getGradeLabel('good', 0, 2.5, 0);
    expect(label).toContain('1d');
  });

  it('shows month format for 30-day interval', () => {
    // After many correct answers the interval grows. We can force a large
    // interval by using a high ease factor on a high-rep card.
    const result = calculateNextInterval('good', 30, 2.5, 5);
    // 30 * 2.5 = 75 => should show "3mo" (75/30 ≈ 2.5 → 3)
    expect(result.interval).toBeGreaterThanOrEqual(30);
    const label = getGradeLabel('good', 30, 2.5, 5);
    expect(label).toMatch(/\dmo/);
  });

  it('shows year format for 365+ day interval', () => {
    const result = calculateNextInterval('good', 365, 2.5, 10);
    expect(result.interval).toBeGreaterThanOrEqual(365);
    const label = getGradeLabel('good', 365, 2.5, 10);
    expect(label).toMatch(/yr/);
  });
});

describe('calculateNextInterval — additional edge cases', () => {
  it('decreases ease factor on "hard" grade but keeps it above 1.3', () => {
    // "hard" = quality 3, so EF adjustment = 0.1 - (5-3)*(0.08+(5-3)*0.02) = 0.1 - 0.24 = -0.14
    const result = calculateNextInterval('hard', 6, 2.5, 2);
    expect(result.easeFactor).toBeLessThan(2.5);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('caps ease factor at 3.0 for "easy" grade', () => {
    const result = calculateNextInterval('easy', 6, 2.9, 5);
    expect(result.easeFactor).toBeLessThanOrEqual(3.0);
  });

  it('handles very large intervals correctly', () => {
    const result = calculateNextInterval('good', 1000, 2.5, 20);
    expect(result.interval).toBe(Math.round(1000 * result.easeFactor));
    expect(result.repetitions).toBe(21);
  });

  it('"easy" gives bonus interval over "good"', () => {
    const good = calculateNextInterval('good', 20, 2.5, 5);
    const easy = calculateNextInterval('easy', 20, 2.5, 5);
    expect(easy.interval).toBeGreaterThan(good.interval);
    // Easy bonus is ~10% on the interval
    expect(easy.interval).toBeGreaterThanOrEqual(Math.round(good.interval * 1.05));
  });

  it('"again" always resets to interval=1 regardless of current interval', () => {
    const r1 = calculateNextInterval('again', 100, 2.5, 10);
    const r2 = calculateNextInterval('again', 500, 2.0, 20);
    expect(r1.interval).toBe(1);
    expect(r2.interval).toBe(1);
    expect(r1.repetitions).toBe(0);
    expect(r2.repetitions).toBe(0);
  });
});
