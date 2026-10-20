import { db } from '../db/schema';
import type { OpeningWeakSpot } from '../types';
import { positionOf } from '../utils/samePosition';

/** ONE id per weak spot: the opening, the POSITION and the move it wants.
 *  It was `${openingId}-${moveIndex}`, which carries no line — move 5 of the
 *  main line and move 5 of a trap line were the same weak spot, so a drill
 *  could replay the wrong position and count another line's misses. */
export function weakSpotId(openingId: string, fen: string, correctMoveSan: string): string {
  return `${openingId}|${positionOf(fen)}|${correctMoveSan.replace(/[+#!?]+$/, '')}`;
}

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
  const id = weakSpotId(openingId, fen, correctMoveSan);
  let existing = await db.openingWeakSpots.get(id);
  // Bridge a row saved under the old move-index id, but only when it is the
  // SAME position — an old row from another line stays where it is.
  if (!existing) {
    const legacyId = `${openingId}-${moveIndex}`;
    const legacy = await db.openingWeakSpots.get(legacyId);
    if (legacy && positionOf(legacy.fen) === positionOf(fen) && legacy.correctMoveSan === correctMoveSan) {
      await db.openingWeakSpots.delete(legacyId);
      existing = { ...legacy, id };
      await db.openingWeakSpots.put(existing);
    }
  }

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
export async function markWeakSpotDrilled(openingId: string, fen: string, correctMoveSan: string): Promise<void> {
  await db.openingWeakSpots.update(weakSpotId(openingId, fen, correctMoveSan), {
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
