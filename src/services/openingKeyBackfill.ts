// openingKeyBackfill — re-mint PERSISTED `GameRecord.openingId` through the ONE
// opening key (WO-STANDARD-01 A1, 2026-09-22).
//
// Why: four writers stored four different things in that column — imports the
// Dexie slug, Play the detected NAME ("Sicilian Defense: Bowdler Attack"), Learn
// the walkthrough tree's name, the samples null — so the departure + result
// terms of the student model never joined, and "your results in this opening"
// was computed over an empty set on every device. Rows already on disk carry
// whichever of the four their writer used; this re-mints every one of them from
// the PGN, the same way every writer now does.
//
// Shape (the `tacticTypeBackfill` pattern, per row): a row is behind when its
// `openingKeyRev !== OPENING_KEY_REV`. Idempotent — a second boot writes
// nothing. No Dexie schema bump: the field is additive and unindexed. Sync-safe:
// a row pulled from an older client is re-minted on the next boot.
//
// Honesty: a game with no PGN, or one whose PGN does not replay, gets NULL —
// never the old value, which may have been a name. Master games are re-minted
// too (their key is the same computation); the student-side filters live in
// the readers.
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import { openingKeyFromPgn } from './openingKey';
import type { GameRecord } from '../types';

/** Bump when the minting changes in a way that should reach persisted rows. */
export const OPENING_KEY_REV = '2026-09-22-one-opening-key';

export interface OpeningKeyBackfillResult {
  scanned: number;
  recomputed: number;
  /** Rows whose stored value actually changed (a name → a key, null → a key…). */
  changed: number;
  /** Rows whose PGN yielded no key (empty / unparseable / left book at ply 0). */
  unkeyed: number;
}

/** Recompute one row. Returns the updated row, or null when it is current. */
export function remintGameRow(row: GameRecord, r: OpeningKeyBackfillResult): GameRecord | null {
  if (row.openingKeyRev === OPENING_KEY_REV) return null;
  r.recomputed += 1;
  const next = row.pgn ? openingKeyFromPgn(row.pgn) : null;
  if (next === null) r.unkeyed += 1;
  if (next !== row.openingId) r.changed += 1;
  return { ...row, openingId: next, openingKeyRev: OPENING_KEY_REV };
}

/**
 * Re-mint every persisted game row behind `OPENING_KEY_REV`. Safe on every
 * boot: rows at the rev cost one read and no write.
 */
export async function reconcileOpeningKeys(): Promise<OpeningKeyBackfillResult> {
  const r: OpeningKeyBackfillResult = { scanned: 0, recomputed: 0, changed: 0, unkeyed: 0 };
  const rows = await db.games.toArray();
  r.scanned = rows.length;
  const writes: GameRecord[] = [];
  for (const row of rows) {
    const next = remintGameRow(row, r);
    if (next) writes.push(next);
  }
  if (writes.length > 0) {
    await db.games.bulkPut(writes);
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingKeyBackfill.reconcileOpeningKeys',
      summary: `openingId re-minted through the one opening key (${OPENING_KEY_REV}): ${r.recomputed} recomputed, ${r.changed} changed, ${r.unkeyed} unkeyed of ${r.scanned}`,
    });
  }
  return r;
}
