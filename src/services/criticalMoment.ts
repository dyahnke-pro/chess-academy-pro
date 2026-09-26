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
// RECONCILED, not duplicated: the tolerance is `criticalityThresholds()
// .critical`, the same band-free bar (B6) `scanCriticality` and
// `positionFacts` already use, so count===1 and severity>='critical' can never
// disagree. G0 throughout — the facts are the engine's; the phrasing pass only
// wraps them.
import { Chess } from 'chess.js';
import { criticalityThresholds } from './criticalityScan';
import { proofAgainstMover } from './exchangeLedger';

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
export type StakeId = 'mate' | 'win' | 'on-top' | 'edge' | 'level' | 'in-it' | 'damage';

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
  /** WHY each discarded candidate fails, when its own engine line PROVES it
   *  (mate, or a settled material loss) — "Nxe5 doesn't work: Nxe5, Qd4 and
   *  Qxe5 — they win a knight". The fan's PVs were read and thrown away before
   *  (WO-TEACH-02 S5); a candidate whose line proves nothing gets no reason. */
  discardedProofs?: Array<{ san: string; text: string }>;
}

/** Mover-POV score of a fan line, mate flattened. */
function moverCp(line: CriticalFanLine, moverColor: 'w' | 'b'): number {
  const sign = moverColor === 'w' ? 1 : -1;
  const raw = line.mate != null ? (line.mate > 0 ? MATE_CP : -MATE_CP) : line.evaluation;
  return raw * sign;
}

/** Best to worst — a move keeps a stake when its own band is at least as
 *  good. Held as a Record so a new stake fails to compile until it is placed. */
const STAKE_ORDER: Record<StakeId, number> = { mate: 6, win: 5, 'on-top': 4, edge: 3, level: 2, 'in-it': 1, damage: 0 };

function stakeFor(bestCp: number): StakeId | null {
  if (bestCp >= MATE_CP) return 'mate';
  // Being mated is not a stake. There is nothing for the move to KEEP, so the
  // clause is dropped rather than promising something the line cannot deliver.
  if (bestCp <= -MATE_CP) return null;
  if (bestCp >= 300) return 'win';
  if (bestCp >= 100) return 'on-top';
  // Half a pawn and up is an EDGE, not "level" — a student a pawn up heard "two
  // moves keep you level" (hand walk 2340, moves 12 and 15).
  if (bestCp >= 50) return 'edge';
  if (bestCp > -100) return 'level';
  if (bestCp >= -300) return 'in-it';
  return 'damage';
}

/** The stake as a predicate, conjugated where it is used.
 *
 *  THREE forms, and each one is a bug this would otherwise ship:
 *   • NUMBER — the count is a computed fact that varies, so "one move KEEPS you
 *     level" and "two moves KEEP you level" must both be sayable. A single form
 *     is the grammar break this repo has already shipped once.
 *   • TENSE — review is RETROSPECTIVE and Learn is PRESENT (CLAUDE.md, the two
 *     narration registers). A review line reading "e4 was the move — it keeps
 *     you level" mixes both in one sentence.
 *  Held as a verb plus its object so a new stake cannot be added with only some
 *  of its forms. */
const STAKE_TEXT: Record<StakeId, { verb: string; verbs: string; past: string; rest: string }> = {
  mate: { verb: 'keep', verbs: 'keeps', past: 'kept', rest: 'the forced mate' },
  win: { verb: 'keep', verbs: 'keeps', past: 'kept', rest: 'the win' },
  'on-top': { verb: 'keep', verbs: 'keeps', past: 'kept', rest: 'you on top' },
  edge: { verb: 'keep', verbs: 'keeps', past: 'kept', rest: 'your edge' },
  level: { verb: 'keep', verbs: 'keeps', past: 'kept', rest: 'you level' },
  'in-it': { verb: 'keep', verbs: 'keeps', past: 'kept', rest: 'you in it' },
  damage: { verb: 'limit', verbs: 'limits', past: 'limited', rest: 'the damage' },
};

export function stakeText(stake: StakeId, opts: { plural?: boolean; past?: boolean } = {}): string {
  const t = STAKE_TEXT[stake];
  const v = opts.past ? t.past : opts.plural ? t.verb : t.verbs;
  return `${v} ${t.rest}`;
}

/** "only one move" / "two moves" — the COUNT, which is the fact David asked for
 *  ("maybe say how many moves keep equality?"). Every register states it. */
function countPhrase(count: number): string {
  return count === 1 ? 'only one move' : 'two moves';
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
  /** Supply to fill `holdingSans` (the review reveal needs to name the move;
   *  Learn deliberately does not). */
  fen?: string;
}): CriticalMomentRead | null {
  const raw = [...(input.topLines ?? [])];
  if (raw.length === 0) return null;
  const tolerance = criticalityThresholds().critical;
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
  // A move HOLDS when it keeps the STAKE the sentence names, not when it sits
  // within a centipawn tolerance of the best (re-walk 1380, 2026-09-26: at +8
  // every move "kept the win" by 100 cp, and the coach still said "two moves
  // keep the win — the rest concede" on eight moves running). The band IS the
  // claim, so a move that stays in the band holds.
  const bestStake = stakeFor(bestCp);
  // Within tolerance still holds (near equality the bands are a few cp wide
  // and would split hairs); the band only ever ADDS holders, so this can only
  // remove a false "the rest concede", never invent a new critical moment.
  const holds = (cp: number): boolean => {
    if (bestCp - cp <= tolerance) return true;
    if (bestStake === null || bestStake === 'damage') return false;
    const s = stakeFor(cp);
    return s !== null && s !== 'damage' && STAKE_ORDER[s] >= STAKE_ORDER[bestStake];
  };
  const within = cps.filter(holds).length;
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
  const discardedProofs: Array<{ san: string; text: string }> = [];
  if (input.fen) {
    for (let i = 0; i < lines.length; i += 1) {
      const uci = lines[i].moves?.[0];
      if (!uci) continue;
      try {
        const c = new Chess(input.fen);
        const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
        if (m) (i < within ? holdingSans : discardedSans).push(m.san);
        if (m && i >= within) {
          const proof = proofAgainstMover(input.fen, lines[i].moves ?? [], input.moverColor);
          if (proof) discardedProofs.push({ san: m.san, text: proof });
        }
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
    discardedProofs,
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
  const s = stakeText(read.stake, { plural: !one });
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
  const s = ` ${stakeText(read.stake, { plural: !one, past: true })}`;
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
  // THE COUNT LEADS. The first cut named only the move — "Nxe2 was the move" —
  // and dropped the one fact the whole computer exists to state. The prod audit
  // read it back and said so ("a moment was selected but nothing said it
  // aloud"), because nothing in the sentence named how many moves held.
  const count = countPhrase(read.count);
  const stake = stakeText(read.stake, { plural: read.count !== 1, past: true });
  // Capitalised: it is a whole sentence, and every caller sets it after a full
  // stop ("You played d4. Only one move kept…").
  const lead = count[0].toUpperCase() + count.slice(1);
  // THE CANDIDATES THAT FAIL, AND WHY (S5) — every discarded move whose own
  // line proves its failure. A candidate move is a lesson only with its reason.
  const fails = (read.discardedProofs ?? []).map((d) => ` ${d.san} didn't work: ${d.text}.`).join('');
  if (read.count === 1 || sans.length === 1) {
    return `${lead} ${stake} here, and it was ${sans[0]}.${fails}`;
  }
  return `${lead} ${stake} here — ${sans[0]} and ${sans[1]}. Everything else conceded.${fails}`;
}

/** Did the student play one of the moves that held? Coordinate-free comparison
 *  is impossible here (the reveal is SAN-only), so the caller passes the SAN the
 *  walk recorded, which came from the same chess.js render as `holdingSans`. */
export function criticalMomentHeld(read: CriticalMomentRead | null, playedSan: string | null): boolean {
  if (!criticalMomentSpeaks(read) || !playedSan) return false;
  return read.holdingSans.includes(playedSan);
}
