import { db } from '../db/schema';
import type { OpeningRecord } from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all repertoire openings, optionally filtered by color. */
export async function getRepertoireOpenings(
  color?: 'white' | 'black',
): Promise<OpeningRecord[]> {
  const all = await db.openings.filter((o) => o.isRepertoire).toArray();
  if (!color) return all;
  return all.filter((o) => o.color === color);
}

/** Returns a single opening by its ID. */
export async function getOpeningById(
  id: string,
): Promise<OpeningRecord | undefined> {
  return db.openings.get(id);
}

/** Returns all openings matching a given ECO code. */
export async function getOpeningByEco(eco: string): Promise<OpeningRecord[]> {
  return db.openings.where('eco').equals(eco).toArray();
}

/**
 * Full-text search over opening names (case-insensitive substring match).
 * Also matches on ECO code prefix.
 */
export async function searchOpenings(query: string): Promise<OpeningRecord[]> {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();

  // Dexie doesn't support full-text search natively — load and filter in JS.
  const all = await db.openings.toArray();
  return all.filter(
    (o) =>
      o.name.toLowerCase().includes(lower) ||
      o.eco.toLowerCase().startsWith(lower),
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * Records a drill attempt and updates rolling accuracy and lastStudied.
 *
 * @param correct  whether the attempt was correct
 * @param timeSeconds  seconds taken to complete the main line (Woodpecker tracking)
 */
export async function updateDrillProgress(
  id: string,
  correct: boolean,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;

  const attempts = opening.drillAttempts + 1;
  const accuracy =
    (opening.drillAccuracy * opening.drillAttempts + (correct ? 1 : 0)) /
    attempts;

  const updates: Partial<OpeningRecord> = {
    drillAttempts: attempts,
    drillAccuracy: accuracy,
    lastStudied: new Date().toISOString(),
  };

  await db.openings.update(id, updates);
}

/**
 * Updates Woodpecker Method tracking fields after a full drill-through of the
 * main line.
 */
export async function updateWoodpecker(
  id: string,
  timeSeconds: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;

  const reps = opening.woodpeckerReps + 1;
  const prevSpeed = opening.woodpeckerSpeed;
  // Rolling average speed
  const newSpeed =
    prevSpeed === null ? timeSeconds : (prevSpeed * (reps - 1) + timeSeconds) / reps;

  await db.openings.update(id, {
    woodpeckerReps: reps,
    woodpeckerSpeed: newSpeed,
    woodpeckerLastDate: new Date().toISOString().split('T')[0],
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Returns the repertoire openings with the weakest drill accuracy.
 * Openings never drilled (drillAttempts === 0) are ranked last to encourage
 * exploration.
 */
export async function getWeakestOpenings(
  limit: number = 5,
  color?: 'white' | 'black',
): Promise<OpeningRecord[]> {
  const repertoire = await getRepertoireOpenings(color);

  return repertoire
    .slice()
    .sort((a, b) => {
      // Never-drilled openings sort after drilled ones but before well-drilled
      const aScore = a.drillAttempts === 0 ? 0.5 : a.drillAccuracy;
      const bScore = b.drillAttempts === 0 ? 0.5 : b.drillAccuracy;
      return aScore - bScore;
    })
    .slice(0, limit);
}

/**
 * Returns openings due for Woodpecker review — those not drilled in the
 * last N days or never drilled.
 */
export async function getWoodpeckerDue(
  daysSince: number = 7,
  color?: 'white' | 'black',
): Promise<OpeningRecord[]> {
  const repertoire = await getRepertoireOpenings(color);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSince);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return repertoire.filter(
    (o) =>
      o.woodpeckerLastDate === null || o.woodpeckerLastDate <= cutoffStr,
  );
}
