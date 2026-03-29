import { db } from '../db/schema';
import type { ModelGame } from '../types';

/**
 * Get all model games for a specific opening.
 */
export async function getModelGamesForOpening(openingId: string): Promise<ModelGame[]> {
  return db.modelGames.where('openingId').equals(openingId).toArray();
}

/**
 * Get a single model game by ID.
 */
export async function getModelGameById(id: string): Promise<ModelGame | undefined> {
  return db.modelGames.get(id);
}

/**
 * Get all model games across all openings.
 */
export async function getAllModelGames(): Promise<ModelGame[]> {
  return db.modelGames.toArray();
}

/**
 * Store model games (idempotent via bulkPut).
 */
export async function storeModelGames(games: ModelGame[]): Promise<void> {
  await db.modelGames.bulkPut(games);
}

/**
 * Count model games for an opening.
 */
export async function countModelGames(openingId: string): Promise<number> {
  return db.modelGames.where('openingId').equals(openingId).count();
}
