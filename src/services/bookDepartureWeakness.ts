// bookDepartureWeakness — the "you leave opening book too early, and it costs
// you" signal (Phase 3 of the unified coach, docs/plans/2026-09-08-unified-coach.md).
//
// David 2026-09-07: "calculate how often/early a user leaves book. Too soon and
// they fuck up the opening and now fight back from a losing position after move
// 3. So the coach explains the theory behind the opening moves and why to play
// certain ones instead of the mistakes they keep making."
//
// This LEAF is pure + synchronous (G0): it does NOT call the masters DB or the
// Lichess explorer — those live in theoryDeparture.ts (async, network-bound) and
// are run ONCE per game at PRECOMPUTE time (never on the /weaknesses hot read
// path). This file owns two jobs: (1) the ADAPTIVE gate that decides whether a
// per-game departure is a real hole (too early for this rating AND it measurably
// hurt), and (2) the aggregator that folds the surviving departures into a
// UnifiedWeakness the profile + Phase-1 selector consume.
//
// Empty > generic > invented: a departure into a fine sideline (no eval cost) is
// NOT a hole; a one-off is NOT a weakness (it must recur). Never flag a departure
// the data can't prove hurt.

import type { UnifiedWeakness } from './weaknessSpine';

/** The book-departure cluster id family (matches the `analysis:<family>:<key>`
 *  convention `bucketForMistake` uses; joins to Phase-1 WeaknessSignal.clusterId
 *  and to conceptForCluster). Per-opening so the coach can name which opening. */
export const BOOK_DEPARTURE_PREFIX = 'analysis:book-departure';
export function bookDepartureCluster(openingId?: string | null): string {
  return openingId ? `${BOOK_DEPARTURE_PREFIX}:${openingId}` : BOOK_DEPARTURE_PREFIX;
}

/** One precomputed per-game departure (produced async at analyze time from
 *  theoryDeparture + the game's own annotations; consumed sync here). */
export interface BookDepartureRow {
  gameId: string;
  /** 1-based ply where the student left the masters book. */
  departurePly: number;
  /** The student's out-of-book move. */
  departedSan: string;
  /** The masters main move at that position (what theory plays). */
  mainSan: string;
  /** Position BEFORE the departure (the last in-book FEN) — drill/teach anchor. */
  bookFen: string;
  /** Eval COST of the departure, student-POV centipawns (>0 = it hurt). Computed
   *  from the game's annotations (evaluation before vs after leaving book). */
  evalCostCp: number;
  /** The opening being left, when known. */
  openingId?: string | null;
  openingName?: string | null;
  /** When the game was played (for recency / lastSeenAt). */
  playedAt: number;
}

/** Rating-relative "expected book depth" in PLIES — how deep a player of this
 *  strength is fairly expected to still be in theory. Leaving BEFORE this is
 *  "too early"; leaving after it is just normal middlegame play, not a book hole.
 *  Deeper for stronger. (One of the adaptive tiers the P7 consolidation folds
 *  into the single depth source.) */
export function expectedBookDepthPlies(rating: number): number {
  if (rating < 1000) return 6;   // ~move 3
  if (rating < 1400) return 8;   // ~move 4
  if (rating < 1800) return 10;  // ~move 5
  if (rating < 2100) return 12;  // ~move 6
  return 14;                     // ~move 7
}

/** Rating-scaled cp drop that counts as "it hurt." A weaker player only learns
 *  from a clear opening fumble (bigger drop); an advanced player from a subtler
 *  one — mirrors the criticality/slip-detector doctrine. */
export function bookDepartureCostThresholdCp(rating: number): number {
  if (rating < 1400) return 100;
  if (rating < 1800) return 70;
  return 50;
}

/** THE ADAPTIVE GATE (David: "book, algo that also"): a departure is a real hole
 *  only when it was BOTH too early for this rating AND it measurably hurt. Pure;
 *  no network. */
export function bookDepartureIsCostly(row: BookDepartureRow, rating: number): boolean {
  return row.departurePly <= expectedBookDepthPlies(rating)
    && row.evalCostCp >= bookDepartureCostThresholdCp(rating);
}

const RECUR_FLOOR = 2; // a one-off early departure is not a weakness; it must recur

/**
 * Fold precomputed, gated departures into UnifiedWeakness rows — one per opening
 * (so the coach names which opening's theory to learn), plus dedupe by opening.
 * Only departures that pass `bookDepartureIsCostly` AND whose opening recurs
 * (≥ RECUR_FLOOR games) surface. Returns [] when nothing qualifies (silence).
 */
export function aggregateBookDepartures(rows: readonly BookDepartureRow[], rating: number): UnifiedWeakness[] {
  const costly = rows.filter((r) => bookDepartureIsCostly(r, rating));
  if (costly.length === 0) return [];
  // Group by opening (null opening → one shared "opening theory" bucket).
  const byOpening = new Map<string, BookDepartureRow[]>();
  for (const r of costly) {
    const k = r.openingId ?? '';
    const arr = byOpening.get(k) ?? [];
    arr.push(r);
    byOpening.set(k, arr);
  }
  const out: UnifiedWeakness[] = [];
  for (const [openingKey, group] of byOpening) {
    if (group.length < RECUR_FLOOR) continue; // one-off → not a hole
    const openingId = openingKey || null;
    const cluster = bookDepartureCluster(openingId);
    const openingName = group.find((g) => g.openingName)?.openingName ?? null;
    const avgCost = group.reduce((s, g) => s + g.evalCostCp, 0) / group.length;
    const earliestPly = Math.min(...group.map((g) => g.departurePly));
    const lastSeenAt = Math.max(...group.map((g) => g.playedAt));
    // Severity 0-100: scales with how costly (cp) AND how early (earlier = worse),
    // capped. A 1.5-pawn drop at move 3 is worse than a 0.7-pawn drop at move 6.
    const costScore = Math.min(70, avgCost / 4);          // 100cp→25, 280cp→70
    const earlyScore = Math.max(0, 30 - earliestPly * 2); // ply2→26, ply10→10
    const severity = Math.round(Math.min(100, costScore + earlyScore));
    const label = openingName
      ? `Leaves book early in the ${openingName}`
      : 'Leaves opening book too early';
    out.push({
      tag: cluster,
      key: cluster,
      label,
      bucket: 'opening',
      openCount: group.length,
      total: group.length,
      severity,
      sources: ['analysis'],
      puzzleThemes: [],
      positions: group
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, 8)
        .map((g) => ({ fen: g.bookFen, playedSan: g.departedSan, bestSan: g.mainSan, ...(openingId ? { openingId } : {}) })),
      lastSeenAt,
      fen: group[0].bookFen,
    });
  }
  return out;
}
