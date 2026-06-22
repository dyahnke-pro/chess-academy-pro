import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { markRungComplete, markWeaponRungComplete, unlockLineAll, unlockOpeningAllLines } from './openingService';
import { isWeaponRungComplete } from '../utils/wlppLadder';
import { buildOpeningRecord } from '../test/factories';

describe('openingService — WLPP ladder marking', () => {
  beforeEach(async () => {
    await db.openings.clear();
  });

  it('markRungComplete backfills every earlier rung (monotonic)', async () => {
    const o = buildOpeningRecord({ id: 'vienna-game' });
    await db.openings.put(o);

    await markRungComplete('vienna-game', 0, 'practice');
    const after = await db.openings.get('vienna-game');
    // practice implies watch + learn + practice; NOT play
    expect(after?.linesDiscovered).toContain(0);
    expect(after?.linesLearned).toContain(0);
    expect(after?.linesPerfected).toContain(0);
    expect(after?.linesPlayed ?? []).not.toContain(0);
  });

  it('play marks every rung including played', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await markRungComplete('x', -1, 'play');
    const a = await db.openings.get('x');
    expect(a?.linesDiscovered).toContain(-1);
    expect(a?.linesLearned).toContain(-1);
    expect(a?.linesPerfected).toContain(-1);
    expect(a?.linesPlayed).toContain(-1);
  });

  it('is idempotent — re-marking does not duplicate indices', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await markRungComplete('x', 0, 'watch');
    await markRungComplete('x', 0, 'watch');
    const a = await db.openings.get('x');
    expect(a?.linesDiscovered?.filter((i) => i === 0)).toHaveLength(1);
  });

  it('tracks lines independently', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await markRungComplete('x', -1, 'learn');
    await markRungComplete('x', 2, 'watch');
    const a = await db.openings.get('x');
    expect(a?.linesLearned).toContain(-1);
    expect(a?.linesLearned ?? []).not.toContain(2);
    expect(a?.linesDiscovered).toEqual(expect.arrayContaining([-1, 2]));
  });

  it('unlockLineAll records the line and is idempotent', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await unlockLineAll('x', 3);
    await unlockLineAll('x', 3);
    const a = await db.openings.get('x');
    expect(a?.linesUnlockedAll).toEqual([3]);
  });

  it('unlockOpeningAllLines unlocks main + every variation index', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'vienna-game' }));
    // 8 variations → main (-1) plus indices 0..7
    await unlockOpeningAllLines('vienna-game', 8);
    const a = await db.openings.get('vienna-game');
    expect(a?.linesUnlockedAll).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('unlockOpeningAllLines with no variations unlocks just the main line', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await unlockOpeningAllLines('x', 0);
    const a = await db.openings.get('x');
    expect(a?.linesUnlockedAll).toEqual([-1]);
  });
});

describe('openingService — weapon (trap/gem) WLPP rung marking', () => {
  beforeEach(async () => {
    await db.openings.clear();
  });

  it('markWeaponRungComplete backfills every earlier rung (monotonic)', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'vienna-game' }));
    await markWeaponRungComplete('vienna-game', 'trap-fishing-pole', 'practice');
    const a = await db.openings.get('vienna-game');
    expect(a?.weaponRungs?.['trap-fishing-pole']).toEqual(
      expect.arrayContaining(['watch', 'learn', 'practice']),
    );
    expect(a?.weaponRungs?.['trap-fishing-pole']).not.toContain('play');
    expect(isWeaponRungComplete(a!, 'trap-fishing-pole', 'practice')).toBe(true);
    expect(isWeaponRungComplete(a!, 'trap-fishing-pole', 'play')).toBe(false);
  });

  it('play marks every weapon rung including played', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await markWeaponRungComplete('x', 'gem-1', 'play');
    const a = await db.openings.get('x');
    expect(a?.weaponRungs?.['gem-1']).toEqual(
      expect.arrayContaining(['watch', 'learn', 'practice', 'play']),
    );
  });

  it('is idempotent — re-marking does not duplicate rungs', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await markWeaponRungComplete('x', 'gem-1', 'watch');
    await markWeaponRungComplete('x', 'gem-1', 'watch');
    const a = await db.openings.get('x');
    expect(a?.weaponRungs?.['gem-1']?.filter((r) => r === 'watch')).toHaveLength(1);
  });

  it('tracks weapons independently by key', async () => {
    await db.openings.put(buildOpeningRecord({ id: 'x' }));
    await markWeaponRungComplete('x', 'trap-a', 'learn');
    await markWeaponRungComplete('x', 'gem-b', 'watch');
    const a = await db.openings.get('x');
    expect(isWeaponRungComplete(a!, 'trap-a', 'learn')).toBe(true);
    expect(isWeaponRungComplete(a!, 'gem-b', 'learn')).toBe(false);
    expect(isWeaponRungComplete(a!, 'gem-b', 'watch')).toBe(true);
  });

  it('isWeaponRungComplete is false for an opening with no weaponRungs', () => {
    const o = buildOpeningRecord({ id: 'x' });
    expect(isWeaponRungComplete(o, 'trap-a', 'watch')).toBe(false);
  });
});
