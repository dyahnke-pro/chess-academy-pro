import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { dayKey, weekStartKey, daysTrainedThisWeek, earnsOpening, recordRingClosed, GOLD_WEEK_DAYS } from './trainingWeek';

describe('trainingWeek', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('weeks start on Monday', () => {
    expect(weekStartKey(new Date(2026, 9, 1))).toBe('2026-09-28'); // Thu → Mon
    expect(weekStartKey(new Date(2026, 9, 4))).toBe('2026-09-28'); // Sun → same Mon
    expect(weekStartKey(new Date(2026, 9, 5))).toBe('2026-10-05');
  });

  it('days are counted per week — a missed day never resets to zero', () => {
    const days = ['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-02', '2026-09-27'];
    expect(daysTrainedThisWeek(days, new Date(2026, 9, 2))).toBe(4);
  });

  it('an opening is earned on a gold week, once a month, free users on paywall builds only', () => {
    const now = new Date(2026, 9, 2);
    const base = { daysThisWeek: GOLD_WEEK_DAYS, earnedMonth: null, now, freeUserOnPaywall: true };
    expect(earnsOpening(base)).toBe(true);
    expect(earnsOpening({ ...base, daysThisWeek: 4 })).toBe(false);
    expect(earnsOpening({ ...base, earnedMonth: '2026-10' })).toBe(false);
    expect(earnsOpening({ ...base, earnedMonth: '2026-09' })).toBe(true);
    expect(earnsOpening({ ...base, freeUserOnPaywall: false })).toBe(false);
  });

  it('closing the ring records the day once and grants on the fifth day', async () => {
    const grant = vi.fn().mockResolvedValue(undefined);
    for (const d of [28, 29, 30]) await recordRingClosed(new Date(2026, 8, d), true, grant);
    await recordRingClosed(new Date(2026, 9, 1), true, grant);
    const again = await recordRingClosed(new Date(2026, 9, 1), true, grant);
    expect(again.firstCloseToday).toBe(false);
    expect(grant).not.toHaveBeenCalled();
    const fifth = await recordRingClosed(new Date(2026, 9, 2), true, grant);
    expect(fifth.goldWeek).toBe(true);
    expect(fifth.earnedOpening).toBe(true);
    expect(grant).toHaveBeenCalledTimes(1);
    const sixth = await recordRingClosed(new Date(2026, 9, 3), true, grant);
    expect(sixth.earnedOpening).toBe(false); // once a month
    expect(dayKey(new Date(2026, 9, 3))).toBe('2026-10-03');
  });
});
