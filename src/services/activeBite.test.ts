import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { startBite, finishBite, __resetActiveBiteForTests } from './activeBite';
import { getCompletedRepKeysToday } from './repCompletion';

describe('activeBite', () => {
  beforeEach(async () => { await db.delete(); await db.open(); __resetActiveBiteForTests(); });

  it('a finish of the matching kind marks the rep done', async () => {
    startBite({ key: 'up:deep-run', kind: 'deep-run' });
    expect(await finishBite('opening')).toBe(false);
    expect(await finishBite('deep-run')).toBe(true);
    expect((await getCompletedRepKeysToday()).has('up:deep-run')).toBe(true);
    expect(await finishBite('deep-run')).toBe(false); // once
  });

  it('a reload mid-bite does not lose the finish', async () => {
    startBite({ key: 'up:long', kind: 'long' });
    await new Promise((r) => setTimeout(r, 20));
    __resetActiveBiteForTests(); // the page reloaded: memory is gone
    expect(await finishBite(['weakness', 'warm-up', 'long'])).toBe(true);
    expect((await getCompletedRepKeysToday()).has('up:long')).toBe(true);
  });

  it('a stale bite does not take credit for a later finish', async () => {
    startBite({ key: 'up:warm-up', kind: 'warm-up' }, Date.now() - 31 * 60 * 1000);
    expect(await finishBite('warm-up')).toBe(false);
  });
});
