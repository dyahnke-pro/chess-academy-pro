import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { arrivalCount, arrivalRate, recordPatternArrival } from './stats';

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

  it('the rate is the share of games the pattern arrived in, per mission', async () => {
    await recordPatternArrival(arrival('g1', true));
    await recordPatternArrival(arrival('g2', true));
    await recordPatternArrival(arrival('g3', false));
    await recordPatternArrival(arrival('g4', true));
    await recordPatternArrival({ missionId: 'develop-and-castle', patternId: 'connect-rooks', gameId: 'g1', arrived: false });
    expect(await arrivalRate('free-piece-stay-ahead')).toBe(0.75);
    expect(await arrivalCount('free-piece-stay-ahead')).toEqual({ games: 4, arrived: 3, rate: 0.75 });
    expect(await arrivalRate('develop-and-castle')).toBe(0);
  });

  it('no game on the record is null, never 0%', async () => {
    expect(await arrivalRate('free-piece-stay-ahead')).toBeNull();
  });

  it('a failing store never throws: the write is dropped, the read says nothing is known', async () => {
    vi.spyOn(db.patternStats, 'put').mockRejectedValue(new Error('quota'));
    vi.spyOn(db.patternStats, 'where').mockImplementation(() => { throw new Error('closed'); });
    await expect(recordPatternArrival(arrival('g1', true))).resolves.toBeUndefined();
    expect(await arrivalCount('free-piece-stay-ahead')).toEqual({ games: 0, arrived: 0, rate: null });
  });
});
