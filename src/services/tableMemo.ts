/**
 * A read memo that follows its table (walk of David's record, 2026-10-19:
 * the skill profile was rebuilt from all 9,761 evidence rows about ten times
 * per Learn move, and the inaccuracy tally from every mistake row on each
 * turn). The memo is dropped by the TABLE's own write hooks, so every writer
 * invalidates it — present and future — without having to remember to.
 *
 * Dropped twice per write: in the hook (so a read inside the same tick does
 * not return the old value) and again when the write's transaction completes
 * (so a read that started between the hook and the commit, and cached the
 * pre-commit rows, is thrown away too).
 */
import type { Table, Transaction } from 'dexie';

export interface TableMemo<T> {
  /** The memoised value, computing it on the first read after a write. */
  get(): Promise<T>;
  /** Forget the value (tests, or a caller that knows better). */
  clear(): void;
}

export function memoOverTable<T>(table: () => Table, compute: () => Promise<T>): TableMemo<T> {
  let value: Promise<T> | null = null;
  let generation = 0;
  let hooked = false;
  const clear = (): void => { generation += 1; value = null; };
  const onWrite = (trans: Transaction | undefined): void => {
    clear();
    trans?.on('complete', clear);
  };
  const hook = (): void => {
    if (hooked) return;
    hooked = true;
    const t = table();
    // A reopened database (a delete-and-recreate, a schema upgrade) carries
    // rows no hook saw being written.
    t.db.on('ready', () => { clear(); }, true);
    t.db.on('close', () => { clear(); });
    t.hook('creating', (_k, _o, trans) => { onWrite(trans); });
    t.hook('updating', (_m, _k, _o, trans) => { onWrite(trans); });
    t.hook('deleting', (_k, _o, trans) => { onWrite(trans); });
  };
  return {
    get(): Promise<T> {
      hook();
      if (value) return value;
      const gen = generation;
      const p = compute().then(
        (v) => v,
        (e: unknown) => { if (generation === gen && value === p) value = null; throw e; },
      );
      value = p;
      return p;
    },
    clear,
  };
}
