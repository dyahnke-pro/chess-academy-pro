import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { recordPatternArrival } from './stats';

const arrival = (gameId: string, arrived: boolean): Parameters<typeof recordPatternArrival>[0] => ({
  missionId: 'free-piece-stay-ahead' as const, patternId: 'free-piece' as const, gameId, arrived,
});

describe('pattern arrival stats', () => {
  beforeEach(async () => { await db.patternStats.clear(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('one row per mission per game, keyed mission:game; a second write overwrites', async () => {
    await recordPatternArrival(arrival('g1', false));
    await recordPatternArrival(arrival('g1', true));
    const rows = await db.patternStats.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'free-piece-stay-ahead:g1', patternId: 'free-piece', gameId: 'g1', arrived: true });
    expect(typeof rows[0].at).toBe('number');
  });

  it('a failing store never throws: the write is dropped', async () => {
    vi.spyOn(db.patternStats, 'put').mockRejectedValue(new Error('quota'));
    await expect(recordPatternArrival(arrival('g1', true))).resolves.toBeUndefined();
  });
});
