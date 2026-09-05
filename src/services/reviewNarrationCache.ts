import { db } from '../db/schema';
import type { ReviewMoveInput, ReviewNarration } from './coachFeatureService';

/**
 * Persisted review narration — re-opening a game is instant.
 *
 * `generateReviewNarration` is the review's single most expensive step after
 * the engine: every open re-ran the facet computers on every ply AND re-paid
 * the house-voice pass over every segment, for a game whose annotations had
 * not changed. Nothing about the walk is per-session; it is a pure function
 * of (annotations, settings, narration revision), so it is cached ON THE GAME
 * under exactly that key (David 2026-09-05: "I clicked on that game again and
 * it restarted the analysis all over").
 *
 * The key changes — and the cache misses — whenever an input that could
 * change a spoken word changes: a deepened annotation (eval / grade / best
 * move), the verbosity dial, the diagnostic uncapped mode, or a bump of
 * REVIEW_NARRATION_REV after a narration-engine change. A stale entry is
 * simply replaced.
 */

/** Bump whenever the narration ENGINE changes what it would say for the same
 *  inputs (a new facet, a reordered cascade, a template change). */
export const REVIEW_NARRATION_REV = 1;

export interface ReviewNarrationCacheEntry {
  rev: number;
  key: string;
  narration: ReviewNarration;
  savedAt: number;
}

/** djb2 — small, stable, dependency-free. Collisions are harmless here (a
 *  regenerated walk), so 32 bits is plenty. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export interface ReviewNarrationKeyInput {
  moves: readonly ReviewMoveInput[];
  playerColor: 'white' | 'black';
  openingName: string | null;
  result: string;
  playerRating: number;
  coachNarration: 'silent' | 'brief' | 'full' | undefined;
  uncapped: boolean;
}

/** The narration is a function of exactly these inputs. */
export function reviewNarrationCacheKey(input: ReviewNarrationKeyInput): string {
  const plies = input.moves.map((m) =>
    [m.san, m.classification ?? '', m.evaluation ?? '', m.preMoveEval ?? '', m.bestMove ?? ''].join(':'),
  ).join('|');
  const meta = [
    REVIEW_NARRATION_REV, input.playerColor, input.openingName ?? '', input.result,
    input.playerRating, input.coachNarration ?? 'full', input.uncapped ? 'u' : 'c',
  ].join('~');
  return `${REVIEW_NARRATION_REV}:${hash(meta)}:${hash(plies)}`;
}

/** Cached narration for this game under this key, or null. Fail-open. */
export async function getCachedReviewNarration(gameId: string, key: string): Promise<ReviewNarration | null> {
  try {
    const rec = await db.games.get(gameId);
    const entry = rec?.reviewNarration;
    if (!entry || entry.rev !== REVIEW_NARRATION_REV || entry.key !== key) return null;
    if (!entry.narration || !Array.isArray(entry.narration.segments)) return null;
    return entry.narration;
  } catch {
    return null;
  }
}

/** Persist the narration on the game. Fail-open — a storage hiccup costs a
 *  cache miss next open, never the walk. */
export async function storeReviewNarration(gameId: string, key: string, narration: ReviewNarration): Promise<void> {
  try {
    const entry: ReviewNarrationCacheEntry = { rev: REVIEW_NARRATION_REV, key, narration, savedAt: Date.now() };
    await db.games.update(gameId, { reviewNarration: entry });
  } catch {
    // fail-open
  }
}
