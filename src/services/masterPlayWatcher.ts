/**
 * masterPlayWatcher
 * -----------------
 * Layer A of WO-COACH-MASTER-INTEGRATION. Silently prefetches master-
 * play data for the current FEN AND top-N look-ahead positions so the
 * pre-injection layer (Layer B) and the LLM tool (Layer C) hit a warm
 * cache instead of paying the live-Lichess latency on every move-
 * question turn.
 *
 * Kid-route exclusion is a HARD safety contract per CLAUDE.md "Kids
 * section non-negotiables": kid surfaces must never trigger any
 * master-play path. The watcher returns immediately when called with
 * a `/kid/*` surface — no cache touch, no audit emit, no network.
 *
 * Look-ahead policy:
 *   - For each FEN the watcher sees, also prefetch positions arising
 *     from the top `LOOKAHEAD_CANDIDATES` master moves. Default 3.
 *   - Depth is 1 ply (configurable via `LOOKAHEAD_DEPTH`).
 *   - Look-ahead positions are computed with chess.js from the
 *     current FEN + the candidate SAN.
 *   - Look-ahead is fire-and-forget; failures don't bubble.
 *
 * Throughput:
 *   - In-flight dedup is delegated to `masterPlayCache.setInFlight`.
 *     Two callers asking for the same FEN share one network round-trip.
 *   - No explicit throttle in v1 — the cache's dedup is the main
 *     protection. If Lichess rate-limit becomes a problem,
 *     `MAX_INFLIGHT_PREFETCHES` is the knob to add.
 *
 * Emits `master-play-prefetch` audit events for every watcher call,
 * including the cache state before resolution (hit / miss-fresh) so
 * the audit script can compute the cache-hit ratio.
 */

import { Chess } from 'chess.js';
import { masterPlayCache, positionFen } from './masterPlayCache';
import { lookupMasterPlay, type LookupTrigger } from './masterPlayLookup';
import type { MasterPlayResult } from './masterPlayTypes';
import { logAppAudit } from './appAuditor';

const KID_SURFACE_RE = /^\/kid(\/|$)/;

/** How many master moves we prefetch look-ahead positions for. */
export const LOOKAHEAD_CANDIDATES = 3;
/** Plies of look-ahead. 1 = the position one move after current. */
export const LOOKAHEAD_DEPTH = 1;

export interface PrefetchOptions {
  /** Route the watcher is mounted on (e.g. `/coach/chat`). Used for
   *  audit attribution AND to gate kid-route exclusion. */
  surface: string;
  /** Session correlator (optional). Audit-stream filters use this. */
  sessionId?: string;
  /** Skip the look-ahead pass for this call. The watcher uses true
   *  internally when prefetching the look-ahead positions themselves
   *  (would otherwise recurse). */
  skipLookahead?: boolean;
  /** Custom trigger label. The walkthrough preload path passes
   *  `'watcher-walkthrough-preload'`. */
  trigger?: LookupTrigger;
}

function emitPrefetchAudit(
  fen: string,
  result: MasterPlayResult,
  latencyMs: number,
  cacheState: 'hit' | 'miss-fresh',
  trigger: 'move' | 'lookahead' | 'walkthrough-preload',
  opts: PrefetchOptions,
): void {
  void logAppAudit({
    kind: 'master-play-prefetch',
    category: 'subsystem',
    source: 'masterPlayWatcher.prefetchMasterPlay',
    summary: `fen=${positionFen(fen).slice(0, 40)}… trigger=${trigger} source=${result.source} cache=${cacheState} latency=${latencyMs}ms surface=${opts.surface}`,
    details: JSON.stringify({
      fen: positionFen(fen),
      trigger,
      source: result.source,
      moveCount: result.moves.length,
      totalGames: result.totalGames,
      latencyMs,
      cacheState,
      surface: opts.surface,
      sessionId: opts.sessionId,
    }),
  });
}

function applyMove(fen: string, san: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    if (!move) return null;
    return chess.fen();
  } catch {
    return null;
  }
}

/**
 * Kick off a prefetch for `fen`. Fire-and-forget — the returned
 * promise resolves when current + all look-ahead lookups have settled,
 * but callers are not required to await.
 *
 * Kid surfaces are short-circuited at the top. Look-ahead recurses
 * once (with `skipLookahead: true`) to fan out to top-N child positions.
 */
export async function prefetchMasterPlay(
  fen: string,
  opts: PrefetchOptions,
): Promise<void> {
  if (KID_SURFACE_RE.test(opts.surface)) {
    // Hard kid contract — return without touching the cache or audit.
    return;
  }

  const key = positionFen(fen);
  const trigger = opts.trigger ?? (opts.skipLookahead ? 'watcher-lookahead' : 'watcher-current');

  // Cache state BEFORE resolution lets the audit reflect whether
  // this prefetch was already warm.
  const cacheState: 'hit' | 'miss-fresh' = masterPlayCache.has(key) ? 'hit' : 'miss-fresh';
  const startedAt = Date.now();

  let result: MasterPlayResult;
  try {
    result = await lookupMasterPlay(key, {
      triggeredBy: trigger,
      surface: opts.surface,
      sessionId: opts.sessionId,
    });
  } catch {
    // lookupMasterPlay shouldn't throw — it returns source:none on
    // failure. Defensive catch keeps the watcher from leaking
    // promise rejections.
    return;
  }

  const triggerLabel: 'move' | 'lookahead' | 'walkthrough-preload' =
    opts.trigger === 'watcher-walkthrough-preload'
      ? 'walkthrough-preload'
      : opts.skipLookahead
        ? 'lookahead'
        : 'move';
  emitPrefetchAudit(key, result, Date.now() - startedAt, cacheState, triggerLabel, opts);

  // Look-ahead pass — only on the top-level call AND only if we got
  // a non-empty master-play result. No data → nothing to look ahead from.
  if (opts.skipLookahead || result.moves.length === 0 || LOOKAHEAD_DEPTH === 0) {
    return;
  }
  const candidates = result.moves.slice(0, LOOKAHEAD_CANDIDATES);
  await Promise.all(
    candidates.map(async (m) => {
      const childFen = applyMove(fen, m.san);
      if (!childFen) return;
      try {
        await prefetchMasterPlay(childFen, {
          surface: opts.surface,
          sessionId: opts.sessionId,
          skipLookahead: true,
        });
      } catch {
        // Swallow — the watcher is best-effort.
      }
    }),
  );
}

/**
 * Walkthrough variant — prefetch every position in a deterministic
 * walkthrough sequence ahead of time. Caller passes the array of FENs
 * the walkthrough will visit; the watcher fires them in parallel so
 * the next-position cache hits when the user advances.
 */
export async function prefetchWalkthroughSequence(
  fens: ReadonlyArray<string>,
  opts: Omit<PrefetchOptions, 'trigger' | 'skipLookahead'>,
): Promise<void> {
  if (KID_SURFACE_RE.test(opts.surface)) return;
  await Promise.all(
    fens.map((fen) =>
      prefetchMasterPlay(fen, {
        surface: opts.surface,
        sessionId: opts.sessionId,
        skipLookahead: true,
        trigger: 'watcher-walkthrough-preload',
      }),
    ),
  );
}

/** Test-only — exposes the kid-route check for assertion. */
export function __isKidSurfaceForTests(surface: string): boolean {
  return KID_SURFACE_RE.test(surface);
}
