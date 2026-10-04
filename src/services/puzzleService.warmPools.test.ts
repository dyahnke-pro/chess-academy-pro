/**
 * The first open of Master inside the app took ~16 s (2026-10-04 timing): the
 * pool download plus its write. The Tactics hub now warms Long and Master in
 * the background, after the bundled set, so the tap joins a finished pool.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const POOL = (source: string): unknown[] => [{
  id: `${source}-1`, fen: '8/8/8/8/8/8/8/K6k w - - 0 1', moves: 'a1a2', rating: 2500,
  themes: ['fork'], openingTags: null, popularity: 90, nbPlays: 10,
}];
const loadDataJson = vi.fn(async (url: string) => POOL(url.includes('master') ? 'master' : 'long'));
vi.mock('./dataFile', () => ({ loadDataJson: (url: string) => loadDataJson(url) }));

const { db } = await import('../db/schema');
const { warmLazyPools, seedMasterPuzzles, isMasterPoolSeeded } = await import('./puzzleService');

describe('warmLazyPools — Long and Master ready before the tap', { timeout: 60000 }, () => {
  beforeEach(async () => {
    loadDataJson.mockClear();
    await db.delete();
    await db.open();
  });

  it('seeds both pools after the bundled set, and a later tap downloads nothing', async () => {
    warmLazyPools();
    await vi.waitFor(async () => { expect(await isMasterPoolSeeded()).toBe(true); }, { timeout: 50000 });
    expect(await db.puzzles.get('long-1')).toBeDefined();
    expect(await db.puzzles.get('master-1')).toBeDefined();
    const fetched = loadDataJson.mock.calls.length;
    await seedMasterPuzzles();
    expect(loadDataJson.mock.calls.length).toBe(fetched);
  });

  it('a tap during the warm-up joins the same write instead of starting a second', async () => {
    warmLazyPools();
    await vi.waitFor(() => { expect(loadDataJson.mock.calls.some(([u]) => u.includes('long'))).toBe(true); }, { timeout: 50000 });
    await seedMasterPuzzles();
    await vi.waitFor(async () => { expect(await isMasterPoolSeeded()).toBe(true); }, { timeout: 50000 });
    const masterFetches = loadDataJson.mock.calls.filter(([u]) => u.includes('master')).length;
    expect(masterFetches).toBe(1);
  });
});
