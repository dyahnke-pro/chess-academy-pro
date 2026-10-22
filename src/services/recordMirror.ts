/**
 * THE STUDENT'S RECORD, READ ONCE (the Learn freeze on a real record,
 * 2026-10-21). After every student move the record settles, and FIVE readers —
 * the weakness signals, the fade levels, the student record, the proven-tag
 * watcher and the skill-meter watcher — each pulled every evidence row and
 * every slip out of IndexedDB again (≈12,000 rows on David's record), and the
 * four `useStudentNeed` mounts did it again whenever the opening's name
 * sharpened. Every pull deserialises the whole table on the main thread; the
 * 2026-10-19 table memo stopped the RECOMPUTES from piling up, but not the
 * reads, and not the readers that never went through it.
 *
 * A mirror holds one table in memory: loaded on the first read, then kept
 * current by the table's OWN write hooks — every key a committed transaction
 * touched is re-read (just those rows) and patched in. So every writer,
 * present and future, keeps it current without knowing it exists, the same
 * contract `memoOverTable` keeps.
 *
 * - `rows()` returns a FROZEN snapshot. A write publishes a new array, never
 *   edits the old one, so the snapshot's identity is a free memo key for
 *   anything derived from it.
 * - A read that starts after a write's hook fired waits for that write to
 *   land — the same order IndexedDB would give a fresh read.
 * - A reopened database (delete-and-recreate, an upgrade) drops the mirror.
 */
import { cmp, type IndexableType, type Table, type Transaction } from 'dexie';
import { db } from '../db/schema';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';
import type { MisconceptionTagRecord } from '../types';

export interface TableMirror<T> {
  /** Every row, in primary-key order (the order `toArray()` gives). */
  rows(): Promise<readonly T[]>;
  /** Forget everything (tests, or a caller that knows better). */
  clear(): void;
}

export function mirrorTable<T>(pick: () => Table<T, IndexableType>): TableMirror<T> {
  let byKey: Map<IndexableType, T> | null = null;
  /** The keys in primary-key order. Kept, not re-sorted: a new row's key
   *  (time-based ids) almost always lands at the end. */
  let order: IndexableType[] = [];
  let snapshot: readonly T[] | null = null;
  let loading: Promise<void> | null = null;
  /** Bumped by a reopen or `clear()`: a load or patch from before it is dropped. */
  let epoch = 0;
  /** Keys written while the first load was in flight — re-read once it lands. */
  let dirtyDuringLoad: IndexableType[] = [];
  /** Writes whose hook fired and whose rows are not yet patched in. */
  const landing = new Set<Promise<void>>();
  const perTransaction = new WeakMap<Transaction, Set<IndexableType>>();
  let hooked = false;

  const reset = (): void => {
    epoch += 1;
    byKey = null;
    order = [];
    snapshot = null;
    loading = null;
    dirtyDuringLoad = [];
  };

  const publish = (map: Map<IndexableType, T>, keys: IndexableType[]): void => {
    byKey = map;
    order = keys;
    snapshot = Object.freeze(keys.map((k) => map.get(k) as T));
  };

  const patch = async (keys: IndexableType[]): Promise<void> => {
    if (keys.length === 0) return;
    if (!byKey) {
      if (loading) dirtyDuringLoad.push(...keys);
      return;
    }
    const at = epoch;
    const fresh = await pick().bulkGet(keys);
    if (at !== epoch || !byKey) return;
    const next = new Map(byKey);
    const added: IndexableType[] = [];
    let removed = false;
    keys.forEach((k, i) => {
      const row = fresh[i];
      if (row === undefined) {
        if (next.delete(k)) removed = true;
      } else {
        if (!next.has(k)) added.push(k);
        next.set(k, row);
      }
    });
    let nextOrder = removed ? order.filter((k) => next.has(k)) : [...order];
    if (added.length > 0) {
      added.sort(cmp);
      const last = nextOrder[nextOrder.length - 1];
      nextOrder = last === undefined || cmp(added[0], last) > 0
        ? nextOrder.concat(added)
        : nextOrder.concat(added).sort(cmp);
    }
    publish(next, nextOrder);
  };

  const onWrite = (key: IndexableType | undefined, trans: Transaction | undefined): void => {
    // A write the hook cannot place (no key, no transaction): read the table
    // afresh rather than guess what changed.
    if (key === undefined || !trans) { reset(); return; }
    let keys = perTransaction.get(trans);
    if (!keys) {
      const touched = new Set<IndexableType>();
      keys = touched;
      perTransaction.set(trans, touched);
      let done!: () => void;
      const landed = new Promise<void>((r) => { done = r; });
      landing.add(landed);
      const finish = (): void => { landing.delete(landed); done(); };
      trans.on('complete', () => { void patch([...touched]).catch(() => reset()).finally(finish); });
      trans.on('abort', finish);
      trans.on('error', finish);
    }
    keys.add(key);
  };

  const hook = (): void => {
    if (hooked) return;
    hooked = true;
    const t = pick();
    // `close` fires on every close, delete and upgrade (Dexie's `_close`), so
    // a reopened database is always read afresh. NOT `ready`: on an open
    // database Dexie calls a new `ready` subscriber at once, which would drop
    // the load this very read is starting.
    t.db.on('close', () => { reset(); });
    t.hook('creating', (k, _o, trans) => { onWrite(k, trans); });
    t.hook('updating', (_m, k, _o, trans) => { onWrite(k, trans); });
    t.hook('deleting', (k, _o, trans) => { onWrite(k, trans); });
  };

  const load = (): Promise<void> => {
    const at = epoch;
    const run = (async () => {
      const table = pick();
      // One bulk read (`toArray` is a single getAll). The key comes off the
      // row when the key path is a plain field — both record tables key on `id`.
      const keyPath = table.schema.primKey.keyPath;
      let keys: IndexableType[];
      let values: Array<T | undefined>;
      if (typeof keyPath === 'string' && keyPath.length > 0 && !keyPath.includes('.')) {
        values = await table.toArray();
        keys = values.map((v) => (v as Record<string, unknown>)[keyPath] as IndexableType);
      } else {
        keys = await table.toCollection().primaryKeys();
        values = await table.bulkGet(keys);
      }
      if (at !== epoch) return;
      const map = new Map<IndexableType, T>();
      const kept: IndexableType[] = [];
      keys.forEach((k, i) => { const v = values[i]; if (v !== undefined && k !== undefined) { map.set(k, v); kept.push(k); } });
      publish(map, kept);
      const late = dirtyDuringLoad;
      dirtyDuringLoad = [];
      await patch(late);
    })();
    // A failed load is not kept: the next read tries again.
    run.catch(() => { if (at === epoch) loading = null; });
    return run;
  };

  return {
    async rows(): Promise<readonly T[]> {
      hook();
      while (landing.size > 0) await Promise.all([...landing]);
      if (snapshot) return snapshot;
      if (!loading) loading = load();
      await loading;
      while (landing.size > 0) await Promise.all([...landing]);
      return snapshot ?? [];
    },
    clear: reset,
  };
}

/** The positive half of the record: every answer the board posed. */
export const evidenceMirror: TableMirror<CapabilityEvidenceRecord> = mirrorTable(() => db.capabilityEvidence as unknown as Table<CapabilityEvidenceRecord, IndexableType>);
/** The negative half: every recorded slip. */
export const slipMirror: TableMirror<MisconceptionTagRecord> = mirrorTable(() => db.misconceptionTags as unknown as Table<MisconceptionTagRecord, IndexableType>);
