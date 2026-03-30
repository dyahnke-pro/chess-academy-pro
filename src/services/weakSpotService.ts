import { db } from '../db/schema';
import type { OpeningWeakSpot } from '../types';

/**
 * Record a failed move attempt at a specific position in an opening.
 * Creates or updates the weak-spot record, incrementing the fail count.
 */
export async function recordWeakSpot(
  openingId: string,
  openingName: string,
  fen: string,
  moveIndex: number,
  correctMoveSan: string,
): Promise<void> {
  const id = `${openingId}-${moveIndex}`;
  const existing = await db.openingWeakSpots.get(id);

  if (existing) {
    await db.openingWeakSpots.update(id, {
      failCount: existing.failCount + 1,
      lastFailedAt: new Date().toISOString(),
    });
  } else {
    const record: OpeningWeakSpot = {
      id,
      openingId,
      openingName,
      fen,
      moveIndex,
      correctMoveSan,
      failCount: 1,
      lastFailedAt: new Date().toISOString(),
      lastDrilledAt: null,
    };
    await db.openingWeakSpots.put(record);
  }
}

/**
 * Mark a weak spot as drilled (user got it right during weak-spot practice).
 */
export async function markWeakSpotDrilled(id: string): Promise<void> {
  await db.openingWeakSpots.update(id, {
    lastDrilledAt: new Date().toISOString(),
  });
}

/**
 * Get all weak spots for a specific opening, sorted by fail count descending.
 */
export async function getWeakSpotsForOpening(openingId: string): Promise<OpeningWeakSpot[]> {
  const spots = await db.openingWeakSpots
    .where('openingId')
    .equals(openingId)
    .toArray();
  return spots.sort((a, b) => b.failCount - a.failCount);
}

/**
 * Get all weak spots across all openings, sorted by fail count descending.
 */
export async function getAllWeakSpots(): Promise<OpeningWeakSpot[]> {
  const spots = await db.openingWeakSpots.toArray();
  return spots.sort((a, b) => b.failCount - a.failCount);
}

/**
 * Get the top N worst weak spots (most failed positions).
 */
export async function getTopWeakSpots(limit: number = 10): Promise<OpeningWeakSpot[]> {
  const all = await getAllWeakSpots();
  return all.slice(0, limit);
}

/**
 * Get weak spots that haven't been drilled recently (stale > 3 days).
 */
export async function getStaleWeakSpots(): Promise<OpeningWeakSpot[]> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const all = await getAllWeakSpots();
  return all.filter(
    (spot) => !spot.lastDrilledAt || spot.lastDrilledAt < threeDaysAgo,
  );
}

/**
 * Clear a weak spot after user demonstrates mastery (e.g., 3 consecutive correct).
 */
export async function clearWeakSpot(id: string): Promise<void> {
  await db.openingWeakSpots.delete(id);
}
