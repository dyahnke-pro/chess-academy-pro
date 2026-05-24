import { db } from '../db/schema';
import type { ModelGame } from '../types';

/** The auto-import boilerplate overview that thin (un-narrated) games carry.
 *  A model game must have a REAL authored overview to surface — mirrors the
 *  punish-gems "no thin-narration ships" bar (David 2026-05-24). */
const BOILERPLATE_OVERVIEW = /Master game from the Lichess masters database|Walk through the moves to see how masters handled/i;

/** True when a model game carries a real authored overview (not the
 *  auto-import boilerplate). Only narrated games surface in ModelGamesSection;
 *  thin ones self-hide until a real overview (+ ideally critical moments) is
 *  authored. */
export function isNarratedModelGame(game: ModelGame): boolean {
  const overview = game.overview?.trim() ?? '';
  return overview.length > 0 && !BOILERPLATE_OVERVIEW.test(overview);
}

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
