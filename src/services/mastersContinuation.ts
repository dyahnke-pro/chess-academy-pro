// MASTERS' CONTINUATIONS — where the opening book ends, recent master games go
// on. The book (`openings-masters-db.json`) stops about fifteen plies into the
// popular lines; TWIC games between players both rated 2500 or more carry on to
// move 15 (`scripts/theory/build-continuations.mjs` counts the move played at
// every position the book lacks). Theory reads a book position first and this
// table second, so "the masters' plan" and "the usual reply" keep speaking where
// the book is silent. Every move is one a rated master played in a real game
// (G3); the table is read synchronously once it is in memory, never fetched by a
// reader.
import { loadDataJson } from './dataFile';
import type { LocalDbMove } from './masterPlayLookup';

export const CONTINUATIONS_URL = '/data/masters-continuations.json';

type Table = Record<string, LocalDbMove[]>;
let table: Table | null = null;
let inflight: Promise<Table | null> | null = null;

const keyOf = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** Load the table once; a missing file is silence, never wrong teaching. */
export function ensureContinuationsLoaded(): Promise<Table | null> {
  if (table) return Promise.resolve(table);
  inflight ??= (async () => {
    try {
      const raw = (await loadDataJson(CONTINUATIONS_URL)) as { positions?: Table } | null;
      table = raw && typeof raw === 'object' && raw.positions ? raw.positions : null;
    } catch { table = null; }
    inflight = null;
    return table;
  })();
  return inflight;
}

/** The masters' moves at a position the book lacks, or null. */
export function continuationMovesSync(fen: string): LocalDbMove[] | null {
  const hit = table?.[keyOf(fen)];
  return hit && hit.length > 0 ? hit : null;
}

/** Test seam — inject a table directly. */
export function __setContinuationsForTests(t: Table | null): void { table = t; inflight = null; }
