// 🔒 /weaknesses READS EACH LIBRARY STORE ONCE (2026-11-25: a new App Store
// user's web view reloaded on that page within a second of opening it, with
// an imported library). The heat map read every game row (PGN + annotations)
// only for its date, and the weakness spine read misconceptionTags twice in
// one transaction. Both fail here on the old code.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { gameDatesById } from './gameDates';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { aggregateMisconceptions, getMisconceptionProfile } from './misconceptionService';
import { useAppStore } from '../stores/appStore';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import { BOOK_DEPARTURE_META_KEY } from './bookDeparturePrecompute';
import type { MisconceptionTagRecord } from '../types';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const slip = (id: string): MisconceptionTagRecord => ({
  id, tag: 'neglected-development', source: 'auto-analysis', createdAt: Date.now() - 86_400_000,
  fen: FEN, playedSan: 'a3', bestSan: 'Bc4', cpLoss: 120, gamePhase: 'opening',
  moveNumber: 3, sourceGameId: `game-${id}`, status: 'open', masteryHits: 0,
  dueAt: Date.now() - 1000, counted: true,
});

describe('/weaknesses reads each store once', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.setState({ activeProfile: buildUserProfile() });
    await db.meta.put({ key: BOOK_DEPARTURE_META_KEY, value: JSON.stringify({ at: Date.now(), gameCount: 0, rows: [] }) });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('game dates come off the date index — no game row is loaded', async () => {
    await db.games.bulkAdd([
      buildGameRecord({ id: 'a', date: '2026.11.20' }),
      buildGameRecord({ id: 'b', date: '2026-11-21' }),
      buildGameRecord({ id: 'c', date: '' }),
    ]);
    const rows = vi.spyOn(db.games, 'toArray');
    const each = vi.spyOn(db.games, 'each');
    const dates = await gameDatesById();
    expect(rows).not.toHaveBeenCalled();
    expect(each).not.toHaveBeenCalled();
    expect(dates.get('a')).toBe(Date.UTC(2026, 10, 20));
    expect(dates.get('b')).toBe(Date.UTC(2026, 10, 21));
    expect(dates.has('c')).toBe(false);
  });

  it('the heat map panel never reads the whole games store', async () => {
    const src = (await import('node:fs')).readFileSync('src/components/Insights/HeatMapPanel.tsx', 'utf8');
    expect(src).not.toMatch(/db\.games\.toArray\(/);
    expect(src).toMatch(/gameDatesById\(/);
  });

  it('the spine reads misconceptionTags ONE time and aggregates the same rows', async () => {
    await db.misconceptionTags.bulkAdd([slip('m1'), slip('m2')]);
    const reads = vi.spyOn(db.misconceptionTags, 'toArray');
    await getUnifiedWeaknessProfile();
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it('aggregating held rows equals reading the store', async () => {
    await db.misconceptionTags.bulkAdd([slip('m1'), slip('m2')]);
    const rows = await db.misconceptionTags.toArray();
    expect(aggregateMisconceptions(rows, { countedOnly: true }))
      .toEqual(await getMisconceptionProfile({ countedOnly: true }));
  });
});
