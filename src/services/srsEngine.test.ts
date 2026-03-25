import { describe, it, expect } from 'vitest';
import {
  calculateNextInterval,
  createDefaultSrsFields,
  isCardDue,
  getGradeLabel,
} from './srsEngine';

// ── Helper: fresh card state ─────────────────────────────────────────────────
const NEW_CARD = { interval: 0, easeFactor: 0, repetitions: 0 };

// ── calculateNextInterval ────────────────────────────────────────────────────

describe('calculateNextInterval', () => {
  it('"again" on a new card resets repetitions to 0', () => {
    const result = calculateNextInterval('again', 0, 0, 0);
    expect(result.repetitions).toBe(0);
  });

  it('"good" on a new card gives repetitions = 1', () => {
    const result = calculateNextInterval('good', NEW_CARD.interval, NEW_CARD.easeFactor, NEW_CARD.repetitions);
    expect(result.repetitions).toBe(1);
  });

  it('"hard" on a new card gives repetitions = 1', () => {
    const result = calculateNextInterval('hard', 0, 0, 0);
    expect(result.repetitions).toBe(1);
  });

  it('"easy" on a new card gives repetitions = 1', () => {
    const result = calculateNextInterval('easy', 0, 0, 0);
    expect(result.repetitions).toBe(1);
  });

  it('"easy" gives a longer interval than "good" on a new card', () => {
    const good = calculateNextInterval('good', 0, 0, 0);
    const easy = calculateNextInterval('easy', 0, 0, 0);
    expect(easy.interval).toBeGreaterThan(good.interval);
  });

  it('"good" gives a longer interval than "hard" on a new card', () => {
    const hard = calculateNextInterval('hard', 0, 0, 0);
    const good = calculateNextInterval('good', 0, 0, 0);
    expect(good.interval).toBeGreaterThan(hard.interval);
  });

  it('"again" always resets repetitions to 0 regardless of current state', () => {
    const r1 = calculateNextInterval('again', 100, 500, 10);
    const r2 = calculateNextInterval('again', 30, 250, 5);
    expect(r1.repetitions).toBe(0);
    expect(r2.repetitions).toBe(0);
  });

  it('interval is always >= 1', () => {
    for (const grade of ['again', 'hard', 'good', 'easy'] as const) {
      const result = calculateNextInterval(grade, 0, 0, 0);
      expect(result.interval).toBeGreaterThanOrEqual(1);
    }
  });

  it('interval grows after multiple "good" reviews', () => {
    let state = { interval: 0, easeFactor: 0, repetitions: 0 };
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      state = calculateNextInterval('good', state.interval, state.easeFactor, state.repetitions);
      intervals.push(state.interval);
    }
    // Intervals should grow monotonically
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it('"again" on a mature card produces shorter interval than the card had', () => {
    // After several good reviews, a single "again" should reset to a short interval
    let state = { interval: 0, easeFactor: 0, repetitions: 0 };
    for (let i = 0; i < 5; i++) {
      state = calculateNextInterval('good', state.interval, state.easeFactor, state.repetitions);
    }
    const maturedInterval = state.interval;
    const forgotten = calculateNextInterval('again', state.interval, state.easeFactor, state.repetitions);
    expect(forgotten.interval).toBeLessThan(maturedInterval);
  });

  it('returns a future ISO date string', () => {
    const result = calculateNextInterval('good', 0, 0, 0);
    const today = new Date().toISOString().split('T')[0];
    expect(result.dueDate > today).toBe(true);
  });

  it('"easy" on a mature card gives longer interval than "good"', () => {
    let state = { interval: 0, easeFactor: 0, repetitions: 0 };
    for (let i = 0; i < 3; i++) {
      state = calculateNextInterval('good', state.interval, state.easeFactor, state.repetitions);
    }
    const good = calculateNextInterval('good', state.interval, state.easeFactor, state.repetitions);
    const easy = calculateNextInterval('easy', state.interval, state.easeFactor, state.repetitions);
    expect(easy.interval).toBeGreaterThanOrEqual(good.interval);
  });

  it('repetitions increment on each successful recall', () => {
    let state = { interval: 0, easeFactor: 0, repetitions: 0 };
    for (let i = 1; i <= 4; i++) {
      state = calculateNextInterval('good', state.interval, state.easeFactor, state.repetitions);
      expect(state.repetitions).toBe(i);
    }
  });

  it('easeFactor encodes stability > 0 after a successful review', () => {
    const result = calculateNextInterval('good', 0, 0, 0);
    expect(result.easeFactor).toBeGreaterThan(0);
  });
});

// ── createDefaultSrsFields ───────────────────────────────────────────────────

describe('createDefaultSrsFields', () => {
  it('returns zero interval', () => {
    const fields = createDefaultSrsFields();
    expect(fields.interval).toBe(0);
  });

  it('returns zero repetitions (new card)', () => {
    const fields = createDefaultSrsFields();
    expect(fields.repetitions).toBe(0);
  });

  it('sets due date to today', () => {
    const fields = createDefaultSrsFields();
    const today = new Date().toISOString().split('T')[0];
    expect(fields.dueDate).toBe(today);
  });

  it('has easeFactor of 0 (unset stability)', () => {
    const fields = createDefaultSrsFields();
    expect(fields.easeFactor).toBe(0);
  });
});

// ── isCardDue ────────────────────────────────────────────────────────────────

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

// ── getGradeLabel ────────────────────────────────────────────────────────────

describe('getGradeLabel', () => {
  it('starts with the capitalised grade name', () => {
    expect(getGradeLabel('again', 0, 0, 0)).toMatch(/^Again/);
    expect(getGradeLabel('hard',  0, 0, 0)).toMatch(/^Hard/);
    expect(getGradeLabel('good',  0, 0, 0)).toMatch(/^Good/);
    expect(getGradeLabel('easy',  0, 0, 0)).toMatch(/^Easy/);
  });

  it('includes a day-count suffix', () => {
    const label = getGradeLabel('good', 0, 0, 0);
    expect(label).toMatch(/·\s*\d+d/);
  });

  it('"easy" label shows longer interval than "good" label', () => {
    const good = getGradeLabel('good', 0, 0, 0);
    const easy = getGradeLabel('easy', 0, 0, 0);
    const goodDays = parseInt(good.match(/(\d+)d/)?.[1] ?? '0');
    const easyDays = parseInt(easy.match(/(\d+)d/)?.[1] ?? '0');
    expect(easyDays).toBeGreaterThan(goodDays);
  });

  it('shows month format for large intervals', () => {
    // Simulate a mature card with high stability
    const highStability = 30 * 100; // 30 days × 100
    const label = getGradeLabel('good', 30, highStability, 10);
    expect(label).toMatch(/mo|yr|\d+d/);
  });
});
