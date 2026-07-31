import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { computeCoachsCall, computeHomeOpening } from './coachsCall';
import { recordTeachingVisit } from './teachingLedger';
import { buildGameRecord } from '../test/factories';

async function seedGames(results: Array<'win' | 'loss'>): Promise<void> {
  // Student plays White vs the AI — result maps directly.
  let day = 10;
  for (const r of results) {
    await db.games.put(buildGameRecord({
      white: 'You',
      black: 'AI Coach',
      result: r === 'win' ? '1-0' : '0-1',
      date: `2026-07-${day} 12:00`,
      isMasterGame: false,
      source: 'coach',
    }));
    day += 1;
  }
}

beforeEach(async () => {
  await db.games.clear();
  await db.meta.delete('teachingLedger');
});

describe("the coach's call", () => {
  it('rough patch + a home opening → prescribe the STRENGTH', async () => {
    await seedGames(['win', 'loss', 'loss', 'loss', 'loss']);
    await recordTeachingVisit('Caro-Kann Defense', 'main', 'the solid c6 wall');
    const call = await computeCoachsCall('Hanging pieces in the middlegame');
    expect(call?.temperature).toBe('rough');
    expect(call?.prescription).toBe('strength');
    expect(call?.line).toContain('Caro-Kann');
    expect(call?.chip).toContain('Continue the');
  });

  it('running hot + a weakness → prescribe the WEAKNESS', async () => {
    await seedGames(['loss', 'win', 'win', 'win', 'win']);
    await recordTeachingVisit('Caro-Kann Defense', 'main', 'the solid c6 wall');
    const call = await computeCoachsCall('Hanging pieces in the middlegame');
    expect(call?.temperature).toBe('hot');
    expect(call?.prescription).toBe('weakness');
    expect(call?.line).toContain('Hanging pieces in the middlegame');
  });

  it('steady → keep building the home opening', async () => {
    await seedGames(['win', 'loss', 'win', 'loss']);
    await recordTeachingVisit('Caro-Kann Defense', 'main', 'the solid c6 wall');
    await recordTeachingVisit('Caro-Kann Defense', 'branch:Advance', 'the advance');
    const call = await computeCoachsCall(null);
    expect(call?.prescription).toBe('strength');
    expect(call?.line).toContain('home opening');
    expect(call?.line).toContain('2 sessions deep');
  });

  it('no signals at all → null (generic greeting stands)', async () => {
    expect(await computeCoachsCall(null)).toBeNull();
  });

  it('home opening weighs ledger visits over one-off games', async () => {
    await recordTeachingVisit('Grand Prix Attack', 'main', 'the f7 storm');
    await recordTeachingVisit('Grand Prix Attack', 'continuation', 'the play-out');
    expect(await computeHomeOpening()).toMatch(/grand prix attack/i);
  });
});
