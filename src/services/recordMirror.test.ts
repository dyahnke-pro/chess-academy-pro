import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndexableType, Table } from 'dexie';
import { db } from '../db/schema';
import { mirrorTable } from './recordMirror';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';
import type { GameRecord } from '../types';

const games = (): Table<GameRecord, IndexableType> => db.games as unknown as Table<GameRecord, IndexableType>;
const ids = (rows: readonly GameRecord[]): string[] => rows.map((g) => g.id);

describe('mirrorTable — the record read once, kept current by the write hooks', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  it('reads the table once, then serves the same frozen snapshot until a write', async () => {
    await db.games.bulkAdd([buildGameRecord(), buildGameRecord()]);
    const spy = vi.spyOn(db.games, 'toArray');
    const m = mirrorTable(games);
    const a = await m.rows();
    const b = await m.rows();
    expect(a).toBe(b);
    expect(a).toHaveLength(2);
    expect(Object.isFrozen(a)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('an add, an update and a delete each land without re-reading the table', async () => {
    const [g1, g2] = [buildGameRecord(), buildGameRecord()];
    await db.games.bulkAdd([g1, g2]);
    const m = mirrorTable(games);
    const before = await m.rows();
    const spy = vi.spyOn(db.games, 'toArray');

    const g3 = buildGameRecord();
    await db.games.add(g3);
    const added = await m.rows();
    expect(ids(added)).toEqual(ids([g1, g2, g3]).sort());
    expect(ids(before)).toHaveLength(2);   // the old snapshot is never edited

    await db.games.update(g1.id, { event: 'mirror-change' });
    expect((await m.rows()).find((g) => g.id === g1.id)?.event).toBe('mirror-change');

    await db.games.delete(g2.id);
    expect(ids(await m.rows())).toEqual(ids([g1, g3]).sort());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('a put over an existing row and a bulkPut of new rows both land', async () => {
    const g1 = buildGameRecord();
    await db.games.add(g1);
    const m = mirrorTable(games);
    await m.rows();
    await db.games.put({ ...g1, event: 'replaced' });
    const more = [buildGameRecord(), buildGameRecord()];
    await db.games.bulkPut(more);
    const rows = await m.rows();
    expect(rows.find((g) => g.id === g1.id)?.event).toBe('replaced');
    expect(rows).toHaveLength(3);
  });

  it('clearing the table empties the mirror', async () => {
    await db.games.bulkAdd([buildGameRecord(), buildGameRecord()]);
    const m = mirrorTable(games);
    expect(await m.rows()).toHaveLength(2);
    await db.games.clear();
    expect(await m.rows()).toHaveLength(0);
  });

  it('a transaction that aborts changes nothing', async () => {
    const g1 = buildGameRecord();
    await db.games.add(g1);
    const m = mirrorTable(games);
    const before = await m.rows();
    await db.transaction('rw', db.games, async () => {
      await db.games.add(buildGameRecord());
      throw new Error('abort');
    }).catch(() => undefined);
    const after = await m.rows();
    expect(ids(after)).toEqual([g1.id]);
    expect(after).toBe(before);
  });

  it('a read issued while a write is in flight sees the write', async () => {
    const m = mirrorTable(games);
    await m.rows();
    const g = buildGameRecord();
    const writing = db.games.add(g);
    const rows = await m.rows();
    await writing;
    expect(ids(rows)).toContain(g.id);
  });

  it('a write that lands while the first load is in flight is not lost', async () => {
    await db.games.add(buildGameRecord());
    const m = mirrorTable(games);
    const reading = m.rows();
    const late = buildGameRecord();
    await db.games.add(late);
    await reading;
    expect(ids(await m.rows())).toContain(late.id);
  });

  it('forgets everything when the database is deleted and reopened', async () => {
    await db.games.add(buildGameRecord());
    const m = mirrorTable(games);
    expect(await m.rows()).toHaveLength(1);
    await db.delete();
    await db.open();
    expect(await m.rows()).toHaveLength(0);
  });

  it('keeps primary-key order, even when a new key sorts before the last', async () => {
    await db.games.bulkAdd([{ ...buildGameRecord(), id: 'b' }, { ...buildGameRecord(), id: 'd' }]);
    const m = mirrorTable(games);
    await m.rows();
    await db.games.add({ ...buildGameRecord(), id: 'c' });
    await db.games.add({ ...buildGameRecord(), id: 'e' });
    expect(ids(await m.rows())).toEqual(ids(await db.games.toArray()));
  });
});
