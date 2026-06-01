import { db } from '../db/schema';
import type { ProGameReference } from '../types';

/**
 * Pro game references — the coach's BREADTH layer of a player's real
 * games (David 2026-06-01). Built by
 * `scripts/pro-repertoire/build-game-references.mjs` into
 * `src/data/pro-game-references.json`, loaded into Dexie by
 * `dataLoader.loadProGameReferences`. The coach reads these for
 * teaching + walkthroughs so it can cite + walk a player's ACTUAL
 * games, not just the ~2 hand-narrated model games per opening.
 */

/** All reference games for a pro opening (e.g. "pro-naroditsky-caro-kann"). */
export async function getGameReferencesForProOpening(
  proOpeningId: string,
): Promise<ProGameReference[]> {
  return db.proGameReferences.where('proOpeningId').equals(proOpeningId).toArray();
}

/** All reference games for a base opening id (e.g. "caro-kann") across
 *  every pro who plays it. */
export async function getGameReferencesForOpening(
  openingId: string,
): Promise<ProGameReference[]> {
  return db.proGameReferences.where('openingId').equals(openingId).toArray();
}

/** All reference games for a pro player (e.g. "naroditsky"). */
export async function getGameReferencesForPlayer(
  playerId: string,
): Promise<ProGameReference[]> {
  return db.proGameReferences.where('playerId').equals(playerId).toArray();
}

/** Count reference games for a pro opening. */
export async function countGameReferencesForProOpening(
  proOpeningId: string,
): Promise<number> {
  return db.proGameReferences.where('proOpeningId').equals(proOpeningId).count();
}

/** Store references (idempotent via bulkPut). */
export async function storeGameReferences(refs: ProGameReference[]): Promise<void> {
  await db.proGameReferences.bulkPut(refs);
}
