// openingKeyBackfill — persisted game rows re-minted through the ONE opening key.
import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';
import { OPENING_KEY_REV, reconcileOpeningKeys, remintGameRow } from './openingKeyBackfill';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';
import { asOpeningKey, openingKeyFromPgn } from './openingKey';
import type { GameRecord, OpeningKey } from '../types';

const SICILIAN_PGN = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *';
const ITALIAN_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *';

describe('openingKeyBackfill', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  it('re-mints a NAME (what Play stored), a book id, a null and a stale key from the PGN — and stamps the rev', async () => {
    const expectSic = openingKeyFromPgn(SICILIAN_PGN)!;
    const expectIta = openingKeyFromPgn(ITALIAN_PGN)!;
    await db.games.bulkPut([
      buildGameRecord({ id: 'name', pgn: SICILIAN_PGN, openingId: 'Sicilian Defense: Najdorf Variation' as unknown as OpeningKey }),
      buildGameRecord({ id: 'bookid', pgn: ITALIAN_PGN, openingId: 'italian-game' as unknown as OpeningKey }),
      buildGameRecord({ id: 'nul', pgn: SICILIAN_PGN, openingId: null }),
      buildGameRecord({ id: 'stale', pgn: ITALIAN_PGN, openingId: expectSic }), // a wrong key
      buildGameRecord({ id: 'nopgn', pgn: '', openingId: 'Something' as unknown as OpeningKey }),
    ]);
    const r = await reconcileOpeningKeys(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(r).toEqual({ scanned: 5, recomputed: 5, changed: 5, unkeyed: 1 });
    const rows = new Map((await db.games.toArray()).map((g) => [g.id, g]));
    expect(rows.get('name')?.openingId).toBe(expectSic);
    expect(rows.get('bookid')?.openingId).toBe(expectIta);
    expect(rows.get('nul')?.openingId).toBe(expectSic);
    expect(rows.get('stale')?.openingId).toBe(expectIta);
    expect(rows.get('nopgn')?.openingId).toBeNull(); // never the old name
    for (const g of rows.values()) {
      expect(g.openingKeyRev).toBe(OPENING_KEY_REV);
      expect(asOpeningKey(g.openingId)).toBe(g.openingId); // every stored value has the shape
    }
  });

  it('is idempotent: a second boot reads and writes nothing', async () => {
    await db.games.put(buildGameRecord({ id: 'g', pgn: SICILIAN_PGN, openingId: null }));
    await reconcileOpeningKeys(IMMEDIATE_BACKFILL_SCHEDULE);
    const again = await reconcileOpeningKeys(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(again).toEqual({ scanned: 1, recomputed: 0, changed: 0, unkeyed: 0 });
  });

  it('a row already at the rev is left alone even when its value looks wrong (the rev is the contract)', () => {
    const row: GameRecord = buildGameRecord({ pgn: SICILIAN_PGN, openingId: null, openingKeyRev: OPENING_KEY_REV });
    const r = { scanned: 0, recomputed: 0, changed: 0, unkeyed: 0 };
    expect(remintGameRow(row, r)).toBeNull();
    expect(r.recomputed).toBe(0);
  });

  it('PERSISTS per batch and YIELDS per row — a force-quit mid-run keeps every finished batch (the 2026-09-22 freeze rule)', async () => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) c.move(s);
    for (let i = 0; i < 25; i += 1) {
      await db.games.put(buildGameRecord({ id: `k${String(i).padStart(2, '0')}`, pgn: c.pgn(), openingId: null }));
    }
    let rows = 0;
    const killed = reconcileOpeningKeys({
      startDelayMs: 0, batch: 10,
      yieldBetweenRows: async () => { rows += 1; if (rows === 14) throw new Error('force-quit'); },
    });
    await expect(killed).rejects.toThrow('force-quit');
    const kept = (await db.games.toArray()).filter((g) => g.openingKeyRev === OPENING_KEY_REV).length;
    expect(kept).toBe(10);
    const again = await reconcileOpeningKeys(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(again.recomputed).toBe(15);
  });
});
