import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { loadMissionRecord, nextLearnSeat, writeMissionResult } from './missionRecord';

const row = (gameId: string, color: 'white' | 'black', at: number) => ({
  gameId, missionId: 'develop-and-castle' as const, level: 1, phase: 'opening' as const, color, outcome: 'pass-first-try' as const, at,
});

describe('mission record', () => {
  beforeEach(async () => { await db.missionResults.clear(); });

  it('one row per mission per game: a second write for the game overwrites', async () => {
    await Promise.all([
      writeMissionResult(row('g1', 'white', 1)),
      writeMissionResult({ ...row('g1', 'white', 2), outcome: 'pass-retry' }),
    ]);
    const rows = await db.missionResults.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'g1:develop-and-castle', outcome: 'pass-retry' });
  });

  it('seats alternate from the record: White with none, then the opposite of the last game', async () => {
    expect(await nextLearnSeat()).toBe('white');
    await writeMissionResult(row('g1', 'white', 1));
    expect(await nextLearnSeat()).toBe('black');
    await writeMissionResult(row('g2', 'black', 2));
    expect(await nextLearnSeat()).toBe('white');
  });

  it('loads the record oldest first for the registry', async () => {
    await writeMissionResult({ ...row('g2', 'black', 5), outcome: 'miss-shown' });
    await writeMissionResult(row('g1', 'white', 1));
    expect(await loadMissionRecord()).toEqual([
      { missionId: 'develop-and-castle', outcome: 'pass-first-try' },
      { missionId: 'develop-and-castle', outcome: 'miss-shown' },
    ]);
  });
});
