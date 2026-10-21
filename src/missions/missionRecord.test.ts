import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { dialsForCard, loadMissionRecord, nextLearnSeat, stepDialsAfterGame, writeMissionResult } from './missionRecord';
import { MISSIONS } from './registry';
import type { MissionResultRecord } from './missionCard';

const row = (gameId: string, color: 'white' | 'black', at: number): Omit<MissionResultRecord, 'id'> & { harder: number } => ({
  gameId, missionId: 'develop-and-castle' as const, level: 1, phase: 'opening' as const, color, outcome: 'pass-first-try' as const, harder: 0, at,
});

describe('mission record', () => {
  beforeEach(async () => { await db.missionResults.clear(); await db.dialState.clear(); });

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
      { missionId: 'develop-and-castle', outcome: 'pass-first-try', at: 1, harder: 0 },
      { missionId: 'develop-and-castle', outcome: 'miss-shown', at: 5, harder: 0 },
    ]);
  });

  it('a watched row says so; an active one does not', async () => {
    await writeMissionResult({ ...row('g1', 'white', 1), outcome: 'missed', watcher: true });
    await writeMissionResult({ ...row('g2', 'black', 2), missionId: 'free-piece-stay-ahead' });
    const rec = await loadMissionRecord();
    expect(rec.find((r) => r.missionId === 'develop-and-castle')).toMatchObject({ watcher: true, outcome: 'missed' });
    expect(rec.find((r) => r.missionId === 'free-piece-stay-ahead')).not.toHaveProperty('watcher');
  });

  it('three first-try passes at the card\'s own setting: one step harder next game — saved and logged', async () => {
    const card = MISSIONS['develop-and-castle'];
    for (let i = 0; i < 3; i++) await writeMissionResult(row(`g${i}`, i % 2 ? 'black' : 'white', i + 1));
    expect(await dialsForCard(card)).toEqual(card.coachDials);
    const step = await stepDialsAfterGame(card, 100);
    expect(step).toMatchObject({ dial: 'strengthOffset', from: 0, to: 100, direction: 'up' });
    expect((await dialsForCard(card)).strengthOffset).toBe(100);
    // Taken again at once: no game has been played at the new setting.
    expect(await stepDialsAfterGame(card, 101)).toBeNull();
  });
});
