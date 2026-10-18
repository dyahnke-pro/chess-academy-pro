import { db } from '../db/schema';
import type { ProGameReference } from '../types';

/** All reference games for a pro player (e.g. "naroditsky"). */
export async function getGameReferencesForPlayer(
  playerId: string,
): Promise<ProGameReference[]> {
  return db.proGameReferences.where('playerId').equals(playerId).toArray();
}

/** Store references (idempotent via bulkPut). */
export async function storeGameReferences(refs: ProGameReference[]): Promise<void> {
  await db.proGameReferences.bulkPut(refs);
}
