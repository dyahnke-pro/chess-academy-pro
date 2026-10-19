import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { memoOverTable } from './tableMemo';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';

describe('memoOverTable', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  it('reads once until the table is written, then reads again', async () => {
    let reads = 0;
    const memo = memoOverTable(() => db.games, async () => { reads += 1; return db.games.count(); });
    expect(await memo.get()).toBe(0);
    expect(await memo.get()).toBe(0);
    expect(reads).toBe(1);
    await db.games.add(buildGameRecord());
    expect(await memo.get()).toBe(1);
    expect(reads).toBe(2);
    const id = (await db.games.toCollection().first())!.id;
    await db.games.update(id, { event: 'memo-test-change' });
    await memo.get();
    expect(reads).toBe(3);
    await db.games.delete(id);
    expect(await memo.get()).toBe(0);
    expect(reads).toBe(4);
  });

  it('forgets everything when the database is deleted and reopened', async () => {
    const memo = memoOverTable(() => db.games, async () => db.games.count());
    await db.games.add(buildGameRecord());
    expect(await memo.get()).toBe(1);
    await db.delete();
    await db.open();
    expect(await memo.get()).toBe(0);
  });

  it('a read that fails is not kept', async () => {
    let fail = true;
    const memo = memoOverTable(() => db.games, async () => { if (fail) throw new Error('x'); return 7; });
    await expect(memo.get()).rejects.toThrow('x');
    fail = false;
    expect(await memo.get()).toBe(7);
  });
});
