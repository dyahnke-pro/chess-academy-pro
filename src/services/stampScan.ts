// stampScan — "which rows are not stamped at this revision?" read off KEYS
// only (2026-11-25, an App Store user's phone in a /weaknesses crash loop).
// The background readers used to find their unread games by loading every
// game — each with its full move-by-move analysis — into JS just to compare
// one stamp field, several times per launch until a pass completed. The
// stamps are indexed (schema v48), so the stamped set is an index-key read
// and only the rows NOT stamped are ever loaded. Per-row stamps, never a
// newest-game watermark: games import out of order, and a watermark would
// skip an older game imported late.
import type { Table } from 'dexie';

/** Primary keys of `table` whose indexed `stampField` is not `rev`. An absent
 *  stamp is not in the index (IndexedDB never indexes undefined), so it is
 *  "all keys minus the stamped keys", both read without loading a row. */
export async function keysNotStampedAt<T, I>(table: Table<T, string, I>, stampField: string, rev: string): Promise<string[]> {
  const [all, stamped] = await Promise.all([
    table.toCollection().primaryKeys(),
    table.where(stampField).equals(rev).primaryKeys(),
  ]);
  const done = new Set<string>(stamped);
  return all.filter((k) => !done.has(k));
}

/** Read only these rows (the ones a keys-only read said may be behind), a
 *  few at a time, keeping only what `pick` returns — so a whole library behind
 *  is never held in memory at once, analysis and all. `pick` may be async; the
 *  thread is handed back between chunks. The one paged reader (`gameScan`
 *  walks the whole games table through it). */
export async function pickRows<T, I, R>(
  table: Table<T, string, I>,
  keys: readonly string[],
  pick: (row: T) => R | null | Promise<R | null>,
  chunk = 25,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < keys.length; i += chunk) {
    const page = await table.bulkGet(keys.slice(i, i + chunk));
    for (const row of page) {
      if (row === undefined) continue;
      const r = await pick(row);
      if (r !== null) out.push(r);
    }
    if (i + chunk < keys.length) await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
  }
  return out;
}

/** Visit these rows a page at a time, keeping nothing — `pickRows` for a
 *  reader that collects into its own structure. */
export async function forEachRow<T, I>(
  table: Table<T, string, I>,
  keys: readonly string[],
  visit: (row: T) => void | Promise<void>,
  chunk = 25,
): Promise<void> {
  await pickRows<T, I, never>(table, keys, async (row) => { await visit(row); return null; }, chunk);
}

