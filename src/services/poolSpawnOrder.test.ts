// 2026-11-25: a new App Store user's web view was killed within seconds of the
// batch pool spawning four asm.js engines at once. On a phone the engines come
// up one after another, so only one asm.js compile is ever in flight.
import { describe, it, expect } from 'vitest';
import { spawnWorkers } from './gameAnalysisService';

function tracked(): { spawn: (i: number) => Promise<number>; maxInFlight: () => number } {
  let inFlight = 0;
  let max = 0;
  return {
    spawn: async (i: number) => {
      inFlight++; max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return i;
    },
    maxInFlight: () => max,
  };
}

describe('pool spawn order', () => {
  it('a phone spawns one engine at a time', async () => {
    const t = tracked();
    const got = await spawnWorkers(2, 0, true, t.spawn);
    expect(got).toEqual([0, 1]);
    expect(t.maxInFlight()).toBe(1);
  });

  it('a desktop still spawns in parallel', async () => {
    const t = tracked();
    await spawnWorkers(4, 0, false, t.spawn);
    expect(t.maxInFlight()).toBe(4);
  });

  it('a failed spawn on a phone is skipped, the rest still come up', async () => {
    const got = await spawnWorkers(3, 0, true, async (i) => { if (i === 1) throw new Error('x'); return i; });
    expect(got).toEqual([0, 2]);
  });
});
