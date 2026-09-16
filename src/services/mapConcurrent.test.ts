// The concurrency lane used to spread review engine reads across the worker
// pool (CLAUDE.md G4.6). Order must survive concurrency — a projection line is
// matched back to its segment by index.
import { describe, it, expect } from 'vitest';
import { mapConcurrent } from './coachFeatureService';

describe('mapConcurrent — the pool lane', () => {
  it('preserves input order even when later items finish first', async () => {
    const out = await mapConcurrent([50, 5, 30, 1], 4, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms));
      return `${i}:${ms}`;
    });
    expect(out).toEqual(['0:50', '1:5', '2:30', '3:1']);
  });
  it('never exceeds the limit in flight', async () => {
    let live = 0;
    let peak = 0;
    await mapConcurrent(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
      live += 1; peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 5));
      live -= 1;
      return null;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1); // it really did run concurrently
  });
  it('runs serially when the pool is unavailable (limit 1)', async () => {
    let peak = 0; let live = 0;
    await mapConcurrent([1, 2, 3], 1, async () => {
      live += 1; peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 2));
      live -= 1; return null;
    });
    expect(peak).toBe(1);
  });
  it('handles an empty list without spawning a lane', async () => {
    expect(await mapConcurrent([], 4, async () => 1)).toEqual([]);
  });
});
