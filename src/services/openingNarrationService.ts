import { db } from '../db/schema';
import type { OpeningNarration } from '../types';

// ─── Match Result ──────────────────────────────────────────────────────────

interface NarrationMatch {
  narration: OpeningNarration;
  matchType: 'fen' | 'opening_move' | 'move_only';
}

// ─── Core Lookup ───────────────────────────────────────────────────────────

/**
 * Find the best matching narration from the database.
 *
 * Priority:
 *  1. Exact FEN match (position-specific, highest confidence)
 *  2. Opening name + move SAN match
 *  3. Move SAN only (lowest confidence, rarely useful)
 *
 * Returns null if no approved narration is found.
 */
export async function getBestNarration(
  fen: string,
  lastMoves: string[],
  openingName?: string,
): Promise<NarrationMatch | null> {
  const currentMove = lastMoves.length > 0 ? lastMoves[lastMoves.length - 1] : null;
  if (!currentMove) return null;

  // 1. Try exact FEN match (strongest signal)
  const fenMatch = await db.openingNarrations
    .where('fen')
    .equals(fen)
    .and((n) => n.approved)
    .first();

  if (fenMatch) {
    return { narration: fenMatch, matchType: 'fen' };
  }

  // 2. Try opening name + move SAN match
  if (openingName) {
    const normalizedName = openingName.toLowerCase();
    const openingMatches = await db.openingNarrations
      .where('moveSan')
      .equals(currentMove)
      .and((n) => n.approved && n.openingName.toLowerCase() === normalizedName)
      .toArray();

    if (openingMatches.length > 0) {
      // Prefer variation-specific match if available
      const variationMatch = openingMatches.find((n) => n.variation.length > 0);
      return {
        narration: variationMatch ?? openingMatches[0],
        matchType: 'opening_move',
      };
    }
  }

  // 3. Fallback: move SAN only (weak match — used sparingly)
  const moveMatch = await db.openingNarrations
    .where('moveSan')
    .equals(currentMove)
    .and((n) => n.approved)
    .first();

  if (moveMatch) {
    return { narration: moveMatch, matchType: 'move_only' };
  }

  return null;
}

// ─── Fallback Decision ────────────────────────────────────────────────────

/**
 * Decides whether to fall back to Claude for annotation.
 *
 * Returns true (use Claude) when:
 *  - No narration match at all
 *  - Match is move-only (too weak to be reliable)
 *  - Narration has no approved entries
 */
export function shouldUseClaudeFallback(match: NarrationMatch | null): boolean {
  if (!match) return true;
  if (match.matchType === 'move_only') return true;
  if (!match.narration.approved) return true;
  if (match.narration.narrations.length === 0) return true;
  return false;
}

// ─── Narration Selection ──────────────────────────────────────────────────

/**
 * Pick one narration string from the available set.
 * Rotates through narrations to provide variety across sessions.
 */
export function pickNarration(narration: OpeningNarration): string {
  if (narration.narrations.length === 0) return '';
  if (narration.narrations.length === 1) return narration.narrations[0];
  const index = Math.floor(Math.random() * narration.narrations.length);
  return narration.narrations[index];
}

// ─── Seed Helpers ─────────────────────────────────────────────────────────

/**
 * Bulk-insert curated narrations into the database.
 * Uses bulkPut for idempotent seeding (safe to call multiple times).
 */
export async function seedNarrations(narrations: OpeningNarration[]): Promise<void> {
  await db.openingNarrations.bulkPut(narrations);
}
