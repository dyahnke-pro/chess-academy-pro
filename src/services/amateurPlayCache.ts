// amateurPlayCache — the "at your level" half of rating-banded reality
// (David 2026-07-11 approval #7; design docs/plans/2026-07-11-danya-style-
// remaining.md #23: "At your level, people play X; masters never touch it").
//
// THE RATE-LIMIT CONTRACT (do NOT regress the 2026-07-11 fix): narration
// paths read this cache ONLY — never the network. The cache is warmed by the
// master-play watcher's already-sanctioned prefetch (one extra ratings-band
// call per TOP-LEVEL game-following prefetch, riding the same out-of-book
// cutoff), through fetchLichessExplorer's shared rate-limit + circuit
// machinery. Kid surfaces excluded, same as the watcher.

import { fetchLichessExplorer } from './lichessExplorerService';
import { positionFen } from './masterPlayCache';
import { logAppAudit } from './appAuditor';

export interface AmateurPlayEntry {
  /** The ratings buckets queried (e.g. "1400,1600"). */
  band: string;
  /** Human band label for narration ("around 1400–1600"). */
  bandLabel: string;
  totalGames: number;
  moves: Array<{ san: string; games: number; pct: number }>;
}

const MAX_ENTRIES = 200;
const entries = new Map<string, AmateurPlayEntry>();
const inFlight = new Set<string>();
const KID_SURFACE_RE = /(^|\/)kid(\/|$)/i;

/** Lichess explorer rating buckets. The band = the two buckets bracketing
 *  the student's rating, for sample size at the student's actual level. */
const BUCKETS = [1000, 1200, 1400, 1600, 1800, 2000, 2200];

export function ratingBandFor(rating: number): { band: string; bandLabel: string } {
  const r = Number.isFinite(rating) ? rating : 1600;
  let lower = BUCKETS[0];
  for (const b of BUCKETS) {
    if (b <= r) lower = b;
  }
  const idx = BUCKETS.indexOf(lower);
  const upper = BUCKETS[Math.min(idx + 1, BUCKETS.length - 1)];
  const band = lower === upper ? `${lower}` : `${lower},${upper}`;
  const bandLabel = lower === upper ? `around ${lower}` : `around ${lower}–${upper}`;
  return { band, bandLabel };
}

/** Cache-only read — NEVER touches the network (the narration contract). */
export function getCachedAmateurPlay(fen: string): AmateurPlayEntry | null {
  return entries.get(positionFen(fen)) ?? null;
}

/** Warm the cache for `fen` at the student's band. Fire-and-forget; rides
 *  fetchLichessExplorer's rate-limit cooldown + circuit breaker. Deduped
 *  per position (one warm per position per session — bands don't shift
 *  mid-game). */
export async function warmAmateurPlay(fen: string, rating: number, surface: string): Promise<void> {
  if (KID_SURFACE_RE.test(surface)) return;
  const key = positionFen(fen);
  if (entries.has(key) || inFlight.has(key)) return;
  inFlight.add(key);
  try {
    const { band, bandLabel } = ratingBandFor(rating);
    const result = await fetchLichessExplorer(fen, 'lichess', { ratings: band });
    const totalGames = result.moves.reduce((acc, m) => acc + (m.white + m.draws + m.black), 0);
    const moves = result.moves.slice(0, 6).map((m) => {
      const games = m.white + m.draws + m.black;
      return { san: m.san, games, pct: totalGames > 0 ? Math.round((games / totalGames) * 100) : 0 };
    });
    if (entries.size >= MAX_ENTRIES) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    entries.set(key, { band, bandLabel, totalGames, moves });
  } catch {
    // Rate-limited / circuit open / network — the cache just stays cold for
    // this position; narration omits the banded fact (empty > generic).
  } finally {
    inFlight.delete(key);
  }
}

/** Compose the rating-reality fact for narration — CACHE-ONLY. Returns null
 *  unless both sides are statistically real (≥50 games each). */
export function buildRatingRealityFact(
  fen: string,
  masters: { san: string; pct: number; totalGames: number } | null,
): string | null {
  const amateur = getCachedAmateurPlay(fen);
  if (!amateur || amateur.totalGames < 50 || amateur.moves.length === 0) return null;
  if (!masters || masters.totalGames < 50) return null;
  const top = amateur.moves[0];
  if (top.san === masters.san) {
    return `At the student's level (${amateur.bandLabel}), ${top.san} is also the most common move here (${top.pct}% of ${amateur.totalGames} games) — amateurs and masters agree in this position.`;
  }
  return `At the student's level (${amateur.bandLabel}), ${top.san} is the most common move here (${top.pct}% of ${amateur.totalGames} games) — but masters prefer ${masters.san} (${masters.pct}%). Name the split naturally when it teaches.`;
}

/** Test-only. */
export function __clearAmateurPlayCache(): void {
  entries.clear();
  inFlight.clear();
}
export function __seedAmateurPlayCache(fen: string, entry: AmateurPlayEntry): void {
  entries.set(positionFen(fen), entry);
}

/** Audit helper — the watcher emits once per warm for observability. */
export function emitAmateurWarmAudit(fen: string, surface: string): void {
  void logAppAudit({
    kind: 'master-play-prefetch',
    category: 'subsystem',
    source: 'amateurPlayCache.warm',
    summary: `amateur band warm for ${positionFen(fen).slice(0, 40)}… surface=${surface}`,
  });
}
