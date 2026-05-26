import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getCompletedRepKeysToday, markRepCompletedToday, REP_PUZZLE_CAP } from './repCompletion';

describe('repCompletion', () => {
  beforeEach(async () => {
    await db.meta.clear();
  });

  it('exposes a sane puzzle cap', () => {
    expect(REP_PUZZLE_CAP).toBe(5);
  });

  it('returns an empty set when nothing is completed', async () => {
    expect(await getCompletedRepKeysToday()).toEqual(new Set());
  });

  it('marks a rep complete and reads it back', async () => {
    await markRepCompletedToday('weakness:pin:Missed pins');
    const keys = await getCompletedRepKeysToday();
    expect(keys.has('weakness:pin:Missed pins')).toBe(true);
  });

  it('is idempotent — marking twice keeps one entry', async () => {
    await markRepCompletedToday('weakness:fork:Missed forks');
    await markRepCompletedToday('weakness:fork:Missed forks');
    const todayKey = `reps-completed:${new Date().toISOString().split('T')[0]}`;
    const record = await db.meta.get(todayKey);
    expect(JSON.parse(record?.value ?? '[]')).toEqual(['weakness:fork:Missed forks']);
  });

  it('tracks multiple distinct reps', async () => {
    await markRepCompletedToday('weakness:pin:Missed pins');
    await markRepCompletedToday('weakness:skewer:Missed skewers');
    const keys = await getCompletedRepKeysToday();
    expect(keys.size).toBe(2);
    expect(keys.has('weakness:pin:Missed pins')).toBe(true);
    expect(keys.has('weakness:skewer:Missed skewers')).toBe(true);
  });

  it('ignores corrupt stored values', async () => {
    const todayKey = `reps-completed:${new Date().toISOString().split('T')[0]}`;
    await db.meta.put({ key: todayKey, value: 'not json' });
    expect(await getCompletedRepKeysToday()).toEqual(new Set());
  });
});
