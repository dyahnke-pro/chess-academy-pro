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
});
