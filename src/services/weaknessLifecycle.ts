/**
 * weaknessLifecycle — the A+ weakness READ over the student's FULL history
 * (David 2026-09-01: "identify errors from deeper in the past that the user has
 * fixed on their own before getting the app … a full read of their chess hx").
 *
 * The existing weakness pipelines (weaknessSpine.getUnifiedWeaknessProfile,
 * gameInsightsService.getMistakeInsights) answer "what's wrong NOW". This adds
 * the TIME dimension: which weaknesses the student has FIXED (used to appear,
 * gone from recent play — including self-fixed before the app), which PERSIST
 * across the whole archive, which are NEW/emerging, and which is MOST PRESSING.
 *
 * G0/G3: every field is COMPUTED from the board-verified mistakePuzzle records
 * (each carries playerMoveSan/bestMoveSan/cpLoss + the real gameDate). The
 * clustering reuses weaknessSpine.bucketForMistake so the lifecycle names the
 * same motifs the /weaknesses tab shows. Nothing here is invented; the coach
 * assembler only phrases these counts.
 *
 * The timeline anchor is the student's LATEST game date, NOT wall-clock — an
 * imported archive can be months old, and "fixed" must mean "gone from recent
 * PLAY", not "gone from recent calendar time".
 */
import { db } from '../db/schema';
import { bucketForMistake } from './weaknessSpine';
import type { MistakePuzzle } from '../types';
import type { MisconceptionBucket } from '../data/misconceptionTags';

export type LifecycleStatus = 'fixed' | 'persistent' | 'emerging' | 'occasional';
export type LifecycleTrend = 'improving' | 'worsening' | 'flat';

export interface WeaknessLifecycleEntry {
  clusterId: string;
  label: string;
  bucket: MisconceptionBucket;
  total: number;
  /** ms — earliest and latest game a matching slip appeared in. */
  firstSeen: number;
  lastSeen: number;
  /** Instances in the RECENT half of the span vs the OLDER half. */
  recentCount: number;
  olderCount: number;
  /** Worst cp-loss across the cluster — the ranking weight. */
  worstCpLoss: number;
  status: LifecycleStatus;
  trend: LifecycleTrend;
}

export interface WeaknessLifecycle {
  /** Used-to-struggle, gone from recent play (self-fixed). */
  fixed: WeaknessLifecycleEntry[];
  /** Recurring across the whole span. */
  persistent: WeaknessLifecycleEntry[];
  /** New / recent-only. */
  emerging: WeaknessLifecycleEntry[];
  /** The single weakness to work on first (non-fixed, highest recent weight). */
  mostPressing: WeaknessLifecycleEntry | null;
  /** Days between first and last analyzed slip. */
  spanDays: number;
  /** Analyzed games (distinct sourceGameId) behind the read. */
  gamesConsidered: number;
  /** Below this, the read is "need more history" (never guess a trend). */
  sampleFloorMet: boolean;
}

/** Minimum distinct analyzed games + total slips before a lifecycle read is
 *  honest. Under this the coach says "I need more of your games first". */
const MIN_GAMES = 4;
const MIN_SLIPS = 6;
/** A cluster with this many OLDER instances and zero recent = FIXED. */
const FIXED_OLDER_FLOOR = 2;

function slipTime(p: MistakePuzzle): number {
  const d = p.gameDate ?? p.createdAt;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : Date.parse(p.createdAt);
}

/**
 * getWeaknessLifecycle — cluster the student's mistake puzzles by motif and
 * classify each cluster's trajectory over the archive timeline. Pure read +
 * arithmetic; the caller (coach assembler) only phrases the result.
 */
export async function getWeaknessLifecycle(): Promise<WeaknessLifecycle> {
  const mistakes = await db.mistakePuzzles.toArray();
  const empty: WeaknessLifecycle = {
    fixed: [], persistent: [], emerging: [], mostPressing: null,
    spanDays: 0, gamesConsidered: 0, sampleFloorMet: false,
  };
  if (mistakes.length === 0) return empty;

  const times = mistakes.map(slipTime).filter((t) => Number.isFinite(t));
  if (times.length === 0) return empty;
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  // Recent half of the PLAY timeline (anchored on the latest game, not
  // wall-clock). A single-day archive collapses to "all recent".
  const mid = minT + (maxT - minT) / 2;

  const games = new Set(mistakes.map((m) => m.sourceGameId));
  const spanDays = Math.max(0, Math.round((maxT - minT) / 86_400_000));
  const sampleFloorMet = games.size >= MIN_GAMES && mistakes.length >= MIN_SLIPS;

  interface Acc { label: string; bucket: MisconceptionBucket; times: number[]; worstCpLoss: number; }
  const groups = new Map<string, Acc>();
  for (const p of mistakes) {
    // Inaccuracies are noise for a lifecycle read — a weakness is a repeated
    // real error (blunder/mistake), not a half-pawn imprecision.
    if (p.classification === 'inaccuracy') continue;
    const meta = bucketForMistake(p);
    const g = groups.get(meta.clusterId) ?? { label: meta.label, bucket: meta.bucket, times: [], worstCpLoss: 0 };
    g.times.push(slipTime(p));
    g.worstCpLoss = Math.max(g.worstCpLoss, p.cpLoss);
    groups.set(meta.clusterId, g);
  }

  const entries: WeaknessLifecycleEntry[] = [];
  for (const [clusterId, g] of groups) {
    const total = g.times.length;
    const recentCount = g.times.filter((t) => t >= mid).length;
    const olderCount = total - recentCount;
    const firstSeen = Math.min(...g.times);
    const lastSeen = Math.max(...g.times);

    let status: LifecycleStatus;
    if (recentCount === 0 && olderCount >= FIXED_OLDER_FLOOR) status = 'fixed';
    else if (recentCount > 0 && olderCount > 0) status = 'persistent';
    else if (recentCount > 0 && olderCount === 0 && total >= 2) status = 'emerging';
    else status = 'occasional';

    // Trend by per-half rate (halves are equal-length in time). improving =
    // the error slowed in the recent half.
    let trend: LifecycleTrend = 'flat';
    if (recentCount < olderCount) trend = 'improving';
    else if (recentCount > olderCount) trend = 'worsening';

    entries.push({ clusterId, label: g.label, bucket: g.bucket, total, firstSeen, lastSeen, recentCount, olderCount, worstCpLoss: g.worstCpLoss, status, trend });
  }

  const fixed = entries.filter((e) => e.status === 'fixed').sort((a, b) => b.total - a.total);
  const persistent = entries.filter((e) => e.status === 'persistent').sort((a, b) => b.recentCount - a.recentCount || b.worstCpLoss - a.worstCpLoss);
  const emerging = entries.filter((e) => e.status === 'emerging').sort((a, b) => b.recentCount - a.recentCount);

  // Most pressing = the non-fixed cluster with the greatest recent weight
  // (recent instances × worst cp-loss). Never a fixed one — you already beat it.
  const pressingPool = entries.filter((e) => e.status !== 'fixed' && e.recentCount > 0);
  pressingPool.sort((a, b) => (b.recentCount * b.worstCpLoss) - (a.recentCount * a.worstCpLoss));
  const mostPressing = pressingPool[0] ?? null;

  return { fixed, persistent, emerging, mostPressing, spanDays, gamesConsidered: games.size, sampleFloorMet };
}
