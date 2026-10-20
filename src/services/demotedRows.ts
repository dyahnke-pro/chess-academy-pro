// demotedRows — the shape of a DEMOTED record row (L6). A slip row or mistake
// puzzle the one price says was not a fault is moved, whole, into the
// `demotedRows` store (`recordReprice`), so no reader of the live stores can
// count it and it can be restored. A leaf (types only), so the schema, the
// backup and the sync import read it without the reprice's import graph.
import type { MisconceptionTagRecord, MistakePuzzle } from '../types';

/** A recorded slip or mistake puzzle the one price says was not a fault, kept
 *  whole so it can be restored. Living in its own store IS the demotion. */
export type DemotedRowRecord = {
  /** `<store>:<rowId>`. */
  id: string;
  demotedAt: number;
  /** The revision that demoted it, and the one-search cost it was demoted on. */
  rev: string;
  costCp: number;
} & (
  | { store: 'misconceptionTags'; row: MisconceptionTagRecord }
  | { store: 'mistakePuzzles'; row: MistakePuzzle }
);

export const demotedId = (store: DemotedRowRecord['store'], rowId: string): string => `${store}:${rowId}`;
