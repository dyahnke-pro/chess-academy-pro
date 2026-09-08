import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getCachedBookDepartureRows } from './bookDeparturePrecompute';
import type { BookDepartureRow } from './bookDepartureWeakness';

const META_KEY = 'book-departure-rows.v1';

const sampleRows: BookDepartureRow[] = [
  { gameId: 'g1', departurePly: 5, departedSan: 'a6', mainSan: 'Nf3', bookFen: 'fen', evalCostCp: 150, openingId: 'caro-kann', openingName: 'Caro-Kann', playedAt: 1000 },
];

describe('getCachedBookDepartureRows — the hot-path cache read (Phase 3)', () => {
  beforeEach(async () => { await db.meta.clear(); });

  it('returns the cached rows without recomputing when the cache is fresh', async () => {
    // Fresh timestamp + matching game count → not stale → no background refresh.
    await db.meta.put({ key: META_KEY, value: JSON.stringify({ at: Date.now(), gameCount: 1, rows: sampleRows }) });
    const games = [{ id: 'g1' }] as never[]; // length 1 matches gameCount
    const rows = await getCachedBookDepartureRows(games, {}, 1400);
    expect(rows).toHaveLength(1);
    expect(rows[0].gameId).toBe('g1');
  });

  it('returns [] (never throws) when the cache is missing — the wire is inert cold', async () => {
    const rows = await getCachedBookDepartureRows([] as never[], {}, 1400);
    expect(rows).toEqual([]);
  });

  it('survives a corrupt cache value', async () => {
    await db.meta.put({ key: META_KEY, value: 'not json' });
    const rows = await getCachedBookDepartureRows([] as never[], {}, 1400);
    expect(rows).toEqual([]);
  });
});
