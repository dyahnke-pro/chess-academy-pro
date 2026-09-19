// criticalMoment — ONE COMPUTER, TWO REGISTERS (David 2026-09-18: "In learn, I
// want coach to say, this is a critical moment only one move keeps equality. On
// review, we are more free to ask questions. No question on learn, question on
// review." → "maybe say how many moves keep equality? Algo that for users.").
//
// THE ONE QUESTION: how many of the engine's moves still hold, and what they
// hold. `>=3` nothing hinges (SILENT), `2` a forgiving fork, `1` only one move
// holds. THE COUNT IS THE TRIGGER — measured 2026-09-18 over 143 real plies at
// two rating bands, "count is 1" and "severity is critical" came out 5/5, 24/25,
// 29/30 identical, because with the tolerance below they are literally the same
// predicate. Treating them as two questions was the design's own first error.
//
// TWO THINGS MEASURED AND CLOSED — do not reopen them:
//  • The MultiPV=3 cap is a NON-ISSUE. We speak only at 1 or 2, which is exactly
//    what a 3-wide fan resolves; 3-of-3-within-tolerance IS the silent case.
//  • A PERSONAL cp-loss tolerance is DISPROVEN. ~1200 and ~2000 came out
//    statistically identical (p50 23 vs 23, p75 49 vs 53) AND it nagged (p50
//    fires 15x/game in both). The right personal number is press/no-press at a
//    critical moment — which this computer creates the signal for.
//
// RECONCILED, not duplicated: the tolerance is `criticalityThresholds(rating)
// .critical`, the same rating-scaled ladder `scanCriticality` and
// `positionFacts` already use, so count===1 and severity>='critical' can never
// disagree. G0 throughout — the facts are the engine's; the phrasing pass only
// wraps them.
import { Chess } from 'chess.js';
import { criticalityThresholds } from './criticalityScan';
import { DEFAULT_STUDENT_RATING } from './ratingBands';

/** A mate is scored flat, for BOTH sides, on purpose: three moves that all mate
 *  are three moves that all win, so nothing hinges and the coach stays silent.
 *  Distance-weighting them would manufacture a "two moves keep the mate" fork
 *  out of mate-in-3 versus mate-in-5, which is not a decision worth stopping a
 *  student for. */
const MATE_CP = 100_000;

/** The fan, as every producer in the app already carries it (white-POV cp). */
export interface CriticalFanLine {
  rank: number;
  evaluation: number;
  mate?: number | null;
  /** The score is a BOUND, not a settled value — see `unresolvedReason`. */
  bound?: 'lower' | 'upper' | null;
  /** UCI principal variation; `[0]` is the move itself. */
  moves?: readonly string[];
}

/** What the best line PRESERVES, mover-POV. Never "equality" by default: that
 *  claim is false when they are winning (it keeps the WIN) and false when they
 *  are lost (it promises a draw that is not there). */
export type StakeId = 'mate' | 'win' | 'on-top' | 'level' | 'in-it' | 'damage';

/** Why a read could not be trusted to a count. Named rather than swallowed: an
 *  instrument that goes quiet without saying why is indistinguishable from one
 *  that found nothing (CLAUDE.md, never run blind). */
export type UnresolvedReason = 'fan-too-narrow' | 'bounded-score' | 'count-fills-fan';

export interface CriticalMomentRead {
  /** Moves scoring within `toleranceCp` of the best, mover-POV. */
  count: number;
  /** Rating-scaled, from `criticalityThresholds`. */
  toleranceCp: number;
  /** Best minus runner-up, mover-POV. The gap `positionFacts` grades severity on. */
  gapCp: number;
  /** TRUE only when the fan PROVED the count — a line fell OUT of tolerance, so
   *  there is no wider fan that could have found a fourth holding move. */
  resolved: boolean;
  unresolvedReason: UnresolvedReason | null;
  /** What the best line preserves. Null when there is no line to read it off
   *  (the mover is being mated) — then the clause is OMITTED, never templated. */
  stake: StakeId | null;
  /** Best line, mover-POV cp (a mate is ±MATE_CP). */
  bestCp: number;
  /** SAN of the holding moves, in fan order — only when a `fen` was supplied. */
  holdingSans: string[];
  /** SAN of the fan's moves that did NOT hold. These are the honest decoys for
   *  a review question: real engine lines from this very position, never a
   *  generated distractor (G0 — nothing here is invented). */
  discardedSans: string[];
}

/** Mover-POV score of a fan line, mate flattened. */
function moverCp(line: CriticalFanLine, moverColor: 'w' | 'b'): number {
  const sign = moverColor === 'w' ? 1 : -1;
  const raw = line.mate != null ? (line.mate > 0 ? MATE_CP : -MATE_CP) : line.evaluation;
  return raw * sign;
}

function stakeFor(bestCp: number): StakeId | null {
  if (bestCp >= MATE_CP) return 'mate';
  // Being mated is not a stake. There is nothing for the move to KEEP, so the
  // clause is dropped rather than promising something the line cannot deliver.
  if (bestCp <= -MATE_CP) return null;
  if (bestCp >= 300) return 'win';
  if (bestCp >= 100) return 'on-top';
  if (bestCp > -100) return 'level';
  if (bestCp >= -300) return 'in-it';
  return 'damage';
}

/** The stake as a predicate, agreeing with its subject. TWO forms because the
 *  count is a fact that varies: "one move KEEPS you level", "two moves KEEP you
 *  level". A single form would ship the exact grammar break this repo has
 *  already shipped once. */
const STAKE_TEXT: Record<StakeId, { one: string; many: string }> = {
  mate: { one: 'keeps the forced mate', many: 'keep the forced mate' },
  win: { one: 'keeps the win', many: 'keep the win' },
  'on-top': { one: 'keeps you on top', many: 'keep you on top' },
  level: { one: 'keeps you level', many: 'keep you level' },
  'in-it': { one: 'keeps you in it', many: 'keep you in it' },
  damage: { one: 'limits the damage', many: 'limit the damage' },
};

export function stakeText(stake: StakeId, plural: boolean): string {
  return plural ? STAKE_TEXT[stake].many : STAKE_TEXT[stake].one;
}

/**
 * THE COMPUTER. Returns null when the fan carries nothing to count.
 *
 * `resolved` is the load-bearing field, not `count`. A 3-wide fan whose three
 * lines all sit within tolerance knows only "at least three" — which is the
 * silent case anyway, so nothing is lost. What must never happen is reporting
 * "two moves hold" from a 2-wide fan that was simply never asked about a third.
 */
export function readCriticalMoment(input: {
  topLines: readonly CriticalFanLine[] | undefined;
  moverColor: 'w' | 'b';
  rating?: number;
  /** Supply to fill `holdingSans` (the review reveal needs to name the move;
   *  Learn deliberately does not). */
  fen?: string;
}): CriticalMomentRead | null {
  const raw = [...(input.topLines ?? [])];
  if (raw.length === 0) return null;
  const tolerance = criticalityThresholds(input.rating ?? DEFAULT_STUDENT_RATING).critical;
  // ORDER BY THE SCORE WE COMPUTED, never by the reported rank. The engine's
  // MultiPV rank is its own ordering of its own numbers, and this function
  // flattens every mate to one value — so a fan carrying two different mate
  // distances no longer agrees with rank order. Re-sorting is one line and
  // makes the count independent of anything the producer got wrong; ties keep
  // rank order so `holdingSans` stays deterministic.
  const scored = raw
    .map((line) => ({ line, cp: moverCp(line, input.moverColor) }))
    .sort((a, b) => b.cp - a.cp || a.line.rank - b.line.rank);
  const lines = scored.map((x) => x.line);
  const cps = scored.map((x) => x.cp);
  const bestCp = cps[0];
  const within = cps.filter((cp) => bestCp - cp <= tolerance).length;
  const gapCp = cps.length >= 2 ? bestCp - cps[1] : 0;

  // A BOUND is not a score. An upper-bounded runner-up may truly be worse than
  // reported (so counting it overstates how forgiving the position is) and a
  // lower-bounded discard may truly be better (so dropping it understates it).
  // Either way the count is unproven, and an unproven count must not speak.
  const bounded = lines.some((l) => l.bound === 'lower' || l.bound === 'upper');
  const reason: UnresolvedReason | null = bounded
    ? 'bounded-score'
    : lines.length < 2
      ? 'fan-too-narrow'
      : within >= lines.length
        ? 'count-fills-fan'
        : null;

  const holdingSans: string[] = [];
  const discardedSans: string[] = [];
  if (input.fen) {
    for (let i = 0; i < lines.length; i += 1) {
      const uci = lines[i].moves?.[0];
      if (!uci) continue;
      try {
        const c = new Chess(input.fen);
        const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
        if (m) (i < within ? holdingSans : discardedSans).push(m.san);
      } catch { /* an unplayable uci names no move */ }
    }
  }

  return {
    count: within,
    toleranceCp: tolerance,
    gapCp,
    resolved: reason === null,
    unresolvedReason: reason,
    stake: stakeFor(bestCp),
    bestCp,
    holdingSans,
    discardedSans,
  };
}

/** Does this read earn a word at all? Resolved, and 1 or 2 moves hold. */
export type SpeakingCriticalMoment = CriticalMomentRead & { stake: StakeId };
export function criticalMomentSpeaks(read: CriticalMomentRead | null): read is SpeakingCriticalMoment {
  // A NULL STAKE IS SILENCE, not a stakeless sentence. `stakeFor` returns null
  // only when the best line is a mate AGAINST the mover — and then every line
  // is, so they all score the flat floor, the count fills the fan, and the read
  // is unresolved anyway. Requiring the stake here says that in one place
  // instead of carrying a branch no board can reach.
  return !!read && read.resolved && !!read.stake && (read.count === 1 || read.count === 2);
}

/** ROTATE THE STEM, NEVER THE CLAIM (David 2026-09-18: "I like the multiple ways
 *  of saying the same thing. Keeps it less computer and more like a coach").
 *  Keyed on the PLY — resume-safe and testable, never `Math.random`. The COUNT
 *  and the STAKE are facts and never vary; only the wrapper does. */
function pick(variants: readonly string[], v: number): string {
  return variants[Math.abs(Math.trunc(v)) % variants.length];
}

/**
 * THE LEARN REGISTER — a STATEMENT, never a question. The student is
 * mid-calculation and a blocking card takes over the decision they are supposed
 * to be making, which is precisely why the mid-game cards were removed in
 * August. It names the count and the stake and then gets out of the way; it
 * never names the move.
 */
export function criticalMomentStatement(read: CriticalMomentRead | null, ply: number): string | null {
  if (!criticalMomentSpeaks(read)) return null;
  const one = read.count === 1;
  const s = stakeText(read.stake, !one);
  return one
    ? pick([
      `Critical moment — only one move ${s}. Slow down here.`,
      `This is the fork in the road: one move ${s}. Take the extra minute.`,
      `Slow down — exactly one move ${s} from this position.`,
      `One move ${s} here, and only one. Worth thinking it through.`,
    ], ply)
    : pick([
      `Critical moment — two moves ${s}; everything else concedes.`,
      `Two moves ${s} here. The rest give it away.`,
      `Narrow here — two moves ${s}, and nothing else does.`,
      `There are exactly two moves that ${s} — the rest concede.`,
    ], ply);
}

/**
 * THE REVIEW REGISTER — the SAME computer, asked. Review is retrospective and
 * the student is not mid-decision, so it may withhold and ask (David: "On
 * review, we are more free to ask questions"). The answer is never in the
 * question — the honesty contract.
 */
export function criticalMomentAsk(read: CriticalMomentRead | null, ply: number): string | null {
  if (!criticalMomentSpeaks(read)) return null;
  const one = read.count === 1;
  const s = ` ${stakeText(read.stake, !one)}`;
  return one
    ? pick([
      `Right here was a critical moment — exactly one move${s}. Can you find it?`,
      `This was the fork in the road: one move${s}. What was it?`,
      `One move${s} from this position, and only one. Which?`,
    ], ply)
    : pick([
      `A critical moment — two moves${s} and everything else concedes. Can you name one?`,
      `Two moves${s} here. What would you have played?`,
      `Narrow moment — two moves hold it. Which would you pick?`,
    ], ply);
}

/** The reveal, after the student has committed. Names the move(s) and the stake
 *  — the first time either is stated. */
export function criticalMomentReveal(read: CriticalMomentRead | null): string | null {
  if (!criticalMomentSpeaks(read)) return null;
  const sans = read.holdingSans;
  if (sans.length === 0) return null;
  if (read.count === 1 || sans.length === 1) {
    return `${sans[0]} was the move — it ${stakeText(read.stake, false)}.`;
  }
  return `${sans[0]} and ${sans[1]} both ${stakeText(read.stake, true)}. Everything else concedes.`;
}

/** Did the student play one of the moves that held? Coordinate-free comparison
 *  is impossible here (the reveal is SAN-only), so the caller passes the SAN the
 *  walk recorded, which came from the same chess.js render as `holdingSans`. */
export function criticalMomentHeld(read: CriticalMomentRead | null, playedSan: string | null): boolean {
  if (!criticalMomentSpeaks(read) || !playedSan) return false;
  return read.holdingSans.includes(playedSan);
}
