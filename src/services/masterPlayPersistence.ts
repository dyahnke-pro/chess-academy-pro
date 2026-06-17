/**
 * masterPlayPersistence
 * ---------------------
 * Dexie-backed durable layer for the master-play grounding pipeline.
 *
 * Master statistics are IMMUTABLE historical aggregates — once a
 * position has been resolved from live Lichess, the answer never
 * changes. The in-memory `masterPlayCache` is process-local, so every
 * cold start (every app open / reload) re-fetched the same positions
 * from the `/api/lichess-explorer` edge function. On Vercel Hobby that
 * tripped the edge-request fair-use cap (David 2026-06-17). This layer
 * persists genuine live results to IndexedDB so a repeat visit costs
 * ZERO edge requests.
 *
 * Sits BETWEEN the bundled local masters DB and the live fetch in
 * `lookupMasterPlay`: local-DB hit → free (bundled asset); Dexie hit →
 * free (disk); only a Dexie miss falls through to the edge.
 *
 * What gets persisted: ONLY `source: 'lichess-live'` results WITH data
 * (totalGames > 0). Never the transient empties — a `source: 'none'`
 * can be a real "no master games" OR a transient network failure, and
 * we must not poison the cache with a failure (it would suppress the
 * retry that would have succeeded). Local-DB hits aren't persisted
 * either — they're already free from the bundled asset.
 *
 * G3 / G0: this is a pure cache of REAL data the pipeline already
 * fetched and validated. It invents nothing.
 */

import { db } from '../db/schema';
import type { MasterPlayResult } from './masterPlayTypes';
import { positionFen } from './masterPlayCache';

/** Bump when the persisted record/result shape changes so old rows are
 *  ignored (treated as a miss → re-fetch) instead of surfacing stale
 *  shapes. */
const CACHE_VERSION = 1;

/** Bound on persisted rows (~1-2 KB each → a few MB at cap). When a
 *  write pushes the table over this, the oldest ~10% by `cachedAt` are
 *  pruned. Generous: the whole point is to avoid re-fetching. */
const MAX_PERSISTED = 5000;

/** Run the prune at most once per this many writes (cheap amortization
 *  — counting + trimming every write would be wasteful). */
const PRUNE_EVERY = 100;
let writesSincePrune = 0;

/**
 * Read a persisted master-play result for a position. Returns null on
 * miss, on a version mismatch, or on any IndexedDB error (the caller
 * then falls through to the live fetch — fail-open, never throws).
 */
export async function readPersistedMasterPlay(
  fen: string,
): Promise<MasterPlayResult | null> {
  try {
    const rec = await db.masterPlayCache.get(positionFen(fen));
    if (!rec || rec.v !== CACHE_VERSION) return null;
    return rec.result;
  } catch {
    return null;
  }
}

/**
 * Persist a resolved master-play result — but ONLY genuine live data
 * with games. Transient empties and bundled-local hits are skipped.
 * Best-effort: swallows IndexedDB errors so a write failure never
 * breaks the lookup. Returns true if it actually wrote.
 */
export async function writePersistedMasterPlay(
  fen: string,
  result: MasterPlayResult,
): Promise<boolean> {
  if (result.source !== 'lichess-live' || result.totalGames <= 0) return false;
  const key = positionFen(fen);
  try {
    await db.masterPlayCache.put({
      fen: key,
      result,
      cachedAt: Date.now(),
      v: CACHE_VERSION,
    });
    writesSincePrune += 1;
    if (writesSincePrune >= PRUNE_EVERY) {
      writesSincePrune = 0;
      void pruneIfOverCap();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Trim the table to MAX_PERSISTED by deleting the oldest rows (by
 * `cachedAt`). Best-effort; runs off the write path. Master data is
 * immutable so eviction order is purely about bounding storage, not
 * freshness.
 */
async function pruneIfOverCap(): Promise<void> {
  try {
    const count = await db.masterPlayCache.count();
    if (count <= MAX_PERSISTED) return;
    const toDrop = count - MAX_PERSISTED + Math.floor(MAX_PERSISTED * 0.1);
    const oldest = await db.masterPlayCache
      .orderBy('cachedAt')
      .limit(toDrop)
      .primaryKeys();
    if (oldest.length) await db.masterPlayCache.bulkDelete(oldest);
  } catch {
    // best-effort; ignore
  }
}

/** Test-only — reset the write counter so prune timing is deterministic. */
export function __resetMasterPlayPersistenceForTests(): void {
  writesSincePrune = 0;
}

/** Exported for tests / future migrations. */
export const __MASTER_PLAY_CACHE_VERSION = CACHE_VERSION;
export const __MASTER_PLAY_MAX_PERSISTED = MAX_PERSISTED;
