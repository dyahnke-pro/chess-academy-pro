/**
 * E14 (hand walk 2026-10-04): a cold open of /tactics/long took ~40 s and
 * /tactics/master ~24 s, because the boot-time seed of the bundled puzzle set
 * held `puzzles` + `meta` in ONE ~12 s transaction, the page's own pool queued
 * behind it, and a full-table count scan ran on every open. The seed is now
 * chunked, yields to foreground puzzle work, and never overwrites a stored row.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { seedPuzzles, isPuzzleSeeded, puzzleForeground } from './puzzleService';
import puzzleData from '../data/puzzles.json';

describe('puzzle seeding — priority and safety', { timeout: 60000 }, () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('the boot seed of the bundled set steps aside while foreground puzzle work runs', async () => {
    let release: () => void = () => undefined;
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    void puzzleForeground(waiting);

    const seeding = seedPuzzles();
    await new Promise((r) => setTimeout(r, 150));
    // Nothing of the bundled set was written while the student's work waited.
    expect(await db.puzzles.count()).toBe(0);
    expect(await isPuzzleSeeded()).toBe(false);

    release();
    await seeding;
    expect(await isPuzzleSeeded()).toBe(true);
    expect(await db.puzzles.count()).toBeGreaterThan(0);
  });

  it('two concurrent seeds share one write and add every row once', async () => {
    await Promise.all([seedPuzzles(), seedPuzzles()]);
    const count = await db.puzzles.count();
    await seedPuzzles();
    expect(await db.puzzles.count()).toBe(count);
  });

  it('never overwrites a puzzle already stored — an attempted row keeps its record', async () => {
    const first = (puzzleData as Array<{ id: string }>)[0];
    const stored = {
      id: first.id,
      fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      moves: 'a1a2',
      rating: 1234,
      themes: ['fork'],
      openingTags: null,
      popularity: 1,
      nbPlays: 1,
      srsInterval: 3,
      srsEaseFactor: 2.5,
      srsRepetitions: 2,
      srsDueDate: '2026-10-10',
      srsLastReview: '2026-10-04',
      userRating: 900,
      attempts: 3,
      successes: 2,
    };
    await db.puzzles.put(stored);
    await seedPuzzles();
    const after = await db.puzzles.get(first.id);
    expect(after?.attempts).toBe(3);
    expect(after?.successes).toBe(2);
  });
});
