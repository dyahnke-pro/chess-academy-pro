import { db } from '../db/schema';
import type { MiniGameId, MiniGameProgress, MiniGameLevelProgress } from '../types';

function metaKey(gameId: MiniGameId): string {
  return `minigame_${gameId}`;
}

export async function getMiniGameProgress(
  gameId: MiniGameId,
): Promise<MiniGameProgress | null> {
  const record = await db.meta.get(metaKey(gameId));
  if (!record) return null;
  return JSON.parse(record.value) as MiniGameProgress;
}

export async function saveMiniGameProgress(
  gameId: MiniGameId,
  progress: MiniGameProgress,
): Promise<void> {
  await db.meta.put({ key: metaKey(gameId), value: JSON.stringify(progress) });
}

/**
 * Record a completed level.  If the player already completed the level with
 * a higher star count the existing record is kept.
 */
export async function completeMiniGameLevel(
  gameId: MiniGameId,
  level: number,
  stars: number,
  hintsUsed: number,
): Promise<MiniGameProgress> {
  let progress = await getMiniGameProgress(gameId);
  if (!progress) {
    progress = { levels: {} };
  }

  const existing = progress.levels[level];
  const newEntry: MiniGameLevelProgress = {
    completed: true,
    stars: existing ? Math.max(existing.stars, stars) : stars,
    hintsUsed,
  };

  progress.levels[level] = newEntry;
  await saveMiniGameProgress(gameId, progress);
  return progress;
}

/**
 * Every kid mini-game level is unlocked. The kids section ("for David's
 * young brother") no longer gates games behind beating the previous level —
 * David 2026-06-19: "unlock everything." Star tracking still records how a
 * level was cleared (see `completeMiniGameLevel`); it just never blocks
 * access. `progress` is kept in the signature so callers don't change.
 */
export function isLevelUnlocked(
  _progress: MiniGameProgress | null,
  _level: number,
): boolean {
  return true;
}
