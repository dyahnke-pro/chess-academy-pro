// weaknessSignal — the student-model input to the narration SELECTOR (Phase 1 of
// the unified coach, docs/plans/2026-09-08-unified-coach.md).
//
// The coach's fact-computers rank a moment by POSITION + RATING only; they do
// not know THIS student's holes. David 2026-09-08: "the coach needs to decide
// what is important PER USER … does it hit a hole THIS student keeps falling in
// — YES!" This leaf turns the durable weakness model (getUnifiedWeaknessProfile
// + getWeaknessLifecycle) into a lightweight, precomputed signal set, and
// provides the pure matchers + the deterministic boost the selector applies.
//
// G0: this is CODE deciding what matters per student — the LLM never sees it. The
// boost is a transparent formula over the student's own profile, NOT a learned
// model. Empty profile → every matcher returns null → zero boost → today's
// behavior (the wire is inert until fed).

import type { UnifiedWeakness } from './weaknessSpine';
import type { WeaknessLifecycle, LifecycleStatus, LifecycleTrend } from './weaknessLifecycle';
import type { MisconceptionBucket } from '../data/misconceptionTags';
import type { TacticPatternType } from '../types/tacticTypes';
import { weaknessClusterForPattern } from './tacticVocabulary';

/** A precomputed, narration-ready view of ONE student weakness: the durable
 *  profile row joined with its lifecycle (recurrence) read. */
export interface WeaknessSignal {
  /** The cluster/tag id — e.g. 'analysis:tactic:fork',
   *  'analysis:conversion-endgame:rook', or a coach misconception tag. This is
   *  the join key to a computed fact's concept. */
  clusterId: string;
  bucket: MisconceptionBucket;
  /** Display label (never used for matching). */
  label: string;
  /** Instances open/due now — the primary recurrence weight. */
  openCount: number;
  /** 0–100, higher = worse. */
  severity: number;
  /** Lifecycle status, when the analysis lifecycle carries this cluster.
   *  undefined = coach-only row OR the sample floor wasn't met (no honest
   *  trend) → treated as a modest, not a big, boost. */
  lifecycleStatus?: LifecycleStatus;
  trend?: LifecycleTrend;
  /** Lichess camelCase theme ids, for downstream drill/theory linking. */
  puzzleThemes: string[];
  /** TOTAL instances ever logged (open or not) — "the fourth time" needs this;
   *  `openCount` is only what is still due. Dropped by this shape until
   *  2026-09-16, which is why the recurrence beat could say a hole recurs but
   *  never how often. */
  total: number;
  /** The PREVIOUS occurrence's game, when the source knows it. Carried through
   *  from the spine's `WeaknessProvenance` so the narration can name it (David
   *  2026-09-16: "Name the game! Date and opponent if available"). Absent when
   *  the source has no game (a drill) or no link yet (coach captures). */
  lastPrior?: { opponentName?: string | null; playedAt?: number };
  /** The distinct GAMES this hole was recorded in, newest first — only the
   *  positions whose provenance names a game. The recurrence clause counts in
   *  games, not rows: two slips in one game are not "recurring in your games".
   *  Absent (not empty) when the source has no provenance at all, so a
   *  coach-only row keeps its count-based read (WO-LOOP-01, 2026-09-20). */
  games?: { gameId: string; opponentName?: string | null; playedAt?: number }[];
}

/** Join the unified profile with the lifecycle read. Lifecycle only carries the
 *  ANALYSIS clusters (it is built from mistakePuzzles), so coach-only rows get
 *  no status/trend — correct: "keeps falling in over time" is an analysis
 *  signal. When the lifecycle sample floor isn't met we drop status/trend
 *  entirely (never guess a trend — weaknessLifecycle's own rule). */
export function buildWeaknessSignals(
  profile: readonly UnifiedWeakness[],
  lifecycle: WeaknessLifecycle | null,
): WeaknessSignal[] {
  const byCluster = new Map<string, { status: LifecycleStatus; trend: LifecycleTrend }>();
  if (lifecycle && lifecycle.sampleFloorMet) {
    for (const e of [...lifecycle.fixed, ...lifecycle.persistent, ...lifecycle.emerging]) {
      byCluster.set(e.clusterId, { status: e.status, trend: e.trend });
    }
  }
  return profile.map((w) => {
    const life = byCluster.get(w.tag);
    return {
      clusterId: w.tag,
      bucket: w.bucket,
      label: w.label,
      openCount: w.openCount,
      severity: w.severity,
      lifecycleStatus: life?.status,
      trend: life?.trend,
      puzzleThemes: w.puzzleThemes,
      total: w.total,
      // positions are newest-first, so [1] is the occurrence BEFORE this one —
      // the one a callback refers to. Undefined when there is no prior or the
      // source cannot name a game; never guessed.
      lastPrior: w.positions[1]?.from
        ? { opponentName: w.positions[1].from.opponentName, playedAt: w.positions[1].from.playedAt }
        : undefined,
      games: distinctGames(w.positions),
    };
  });
}

/** Distinct games among a row's positions (newest first), or undefined when
 *  NO position carries provenance — the difference between "no games" and
 *  "this source cannot say" matters to `recurrenceFor`. */
function distinctGames(positions: UnifiedWeakness['positions']): WeaknessSignal['games'] {
  if (!positions.some((p) => p.from)) return undefined;
  const out: NonNullable<WeaknessSignal['games']> = [];
  const seen = new Set<string>();
  for (const p of positions) {
    const id = p.from?.gameId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ gameId: id, opponentName: p.from?.opponentName, playedAt: p.from?.playedAt });
  }
  return out;
}

/** The deterministic boost a matched weakness adds to a fact's rank. Keyed on
 *  the lifecycle — "keeps falling in" (persistent + worsening) earns the most;
 *  a self-fixed hole earns nothing. Capped so a live safety-critical fact
 *  (must-defend, blunder, mate) still leads — the boost re-orders COMPARABLE
 *  facts and lets a hole that is ALSO the student's persistent leak top the
 *  briefing, without vaulting a quiet positional note over a hanging piece. */
export const MAX_WEAKNESS_BOOST = 30;

export function boostFor(s: WeaknessSignal): number {
  if (s.lifecycleStatus === 'fixed') return 0;
  let b: number;
  if (s.lifecycleStatus === 'persistent') b = 16;
  else if (s.lifecycleStatus === 'emerging') b = 10;
  else b = 6; // occasional / no-lifecycle but still an open weakness
  if (s.trend === 'worsening') b += 8;
  else if (s.trend === 'improving') b -= 4;
  b += Math.min(6, s.openCount * 2); // a little extra for volume, capped
  return Math.max(0, Math.min(MAX_WEAKNESS_BOOST, b));
}

/** Of the signals matching a predicate, the one whose boost is largest (the
 *  most-pressing hole among the matches), or null. */
function bestMatch(signals: readonly WeaknessSignal[], pred: (s: WeaknessSignal) => boolean): WeaknessSignal | null {
  let best: WeaknessSignal | null = null;
  let bestB = 0;
  for (const s of signals) {
    if (!pred(s)) continue;
    const b = boostFor(s);
    if (b > bestB) { bestB = b; best = s; }
  }
  return best;
}

/** Match a positionFacts clause KIND to the student's holes it teaches to. Only
 *  the clear semantic links are mapped — never a forced match (G3): a clause
 *  whose kind has no honest weakness counterpart returns null. `kind` is a
 *  string (not the ClauseKind type) to keep this leaf decoupled from
 *  positionFacts and avoid a circular import. */
export function matchClauseKind(kind: string, signals: readonly WeaknessSignal[]): WeaknessSignal | null {
  switch (kind) {
    case 'must-defend': // about to drop a piece / miss an incoming threat
      return bestMatch(signals, (s) => s.clusterId === 'analysis:tactic:hanging_piece' || s.clusterId === 'analysis:missed-threat');
    case 'latent-danger': // walking your own king/queen into a pin or skewer
      return bestMatch(signals, (s) => s.clusterId === 'analysis:tactic:pin' || s.clusterId === 'analysis:tactic:skewer');
    // A tactic the student can SET UP — the dual-use rule at its sharpest: the
    // computer that shows you a fork two moves out is the one that catches you
    // missing them, so it joins the FORK hole. Until 2026-09-21 this clause was
    // emitted as `latent-danger` for both seats, so a fork the student could
    // PLAY was matched against a "you get pinned" hole — the right computer
    // joined to the wrong weakness, silently, for every student who had one.
    case 'latent-chance':
      return bestMatch(signals, (s) => s.clusterId === 'analysis:tactic:fork');
    case 'convert': // failing to convert a won position
      return bestMatch(signals, (s) => s.clusterId.startsWith('analysis:conversion-endgame:') || s.bucket === 'endgame');
    case 'fundamental':
    case 'structure-plan': // positional understanding
      // `fundamental:<id>` rows (weaknessSpine.aggregateFundamentals, 2026-09-19)
      // are the attributed fundamentals the batch sweep proved on the student's
      // own games — the finest positional hole the profile carries, so they join
      // the positional clauses beside the coarser bucket/structure rows.
      return bestMatch(signals, (s) => s.bucket === 'positional' || s.clusterId.startsWith('fundamental:') || s.clusterId.startsWith('analysis:structure') || s.clusterId.startsWith('analysis:phase:'));
    default:
      return null; // status / deliberation / key-moment / *-leans / opponent-intent: no honest single-hole mapping
  }
}

/** Match a LIVE tactic motif (TacticPatternType) to a tactic weakness, via the
 *  canonical vocabulary bridge. null when the motif has no weakness counterpart
 *  (mate_threat / battery / none) or the student has no such hole. */
export function matchTacticPattern(pattern: TacticPatternType, signals: readonly WeaknessSignal[]): WeaknessSignal | null {
  const cluster = weaknessClusterForPattern(pattern);
  if (!cluster) return null;
  return bestMatch(signals, (s) => s.clusterId === cluster);
}

/** Match a raw tag a fact already carries (e.g. a causal-chain node's
 *  misconception tag, or an analysis cluster id) to a weakness. */
export function matchTag(tag: string | undefined | null, signals: readonly WeaknessSignal[]): WeaknessSignal | null {
  if (!tag) return null;
  return bestMatch(signals, (s) => s.clusterId === tag);
}

/** Match an ATTRIBUTED fundamental (the `FundamentalId` the sweep or the review
 *  attributor proved on this ply) to the student's own record of it — the
 *  `fundamental:<id>` rows `weaknessSpine.aggregateFundamentals` builds. Exact,
 *  never by bucket: "you keep leaving pieces loose" must be backed by loose-piece
 *  rows, not by any positional hole. null when no such record exists (grey). */
export function matchFundamental(id: string | undefined | null, signals: readonly WeaknessSignal[]): WeaknessSignal | null {
  if (!id) return null;
  return matchTag(`fundamental:${id}`, signals);
}
