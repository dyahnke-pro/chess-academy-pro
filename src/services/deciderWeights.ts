// THE DECIDER'S WEIGHTS, LEARNED FROM HIS GAMES (David 2026-11-05: "the matrix
// … the decider we have already. Which ones can we tweak to match and how do we
// set it so it's universal?" → "we train it … by feeding these games and
// positions").
//
// The decider ranked an unstaked fact — a plan, a pin, a structure read, the
// idea of the opening — by a number typed into a lane table, and that number
// decided which idea led the turn, took its step's one slot, rode past the
// word budget, and whether it spoke in an endgame at all. On his games it let
// "on e2 it blocks their bishop" speak and held "…c5 hits the chain at its
// base". The number is now HIS: how often he makes a fact's teaching move in
// this kind of moment when the coach has it to say, fitted on his live games
// (`scripts/scoreboard/fit-decider-weights.py`; the 54 full games held out).
//
// One table, read by every surface that decides through the one door: a fact
// is weighed by its kind, as measured on his positions; a kind not yet
// measured keeps its lane's number until a training run measures it. Stakes still lead — danger and a tactic speak by what is
// at stake; this weighs the facts that carry none.
import WEIGHTS from '../data/decider-weights.json';
import type { CoachFactKind } from './coachFact';
import type { GamePhase } from '../types';

/** Whose move the moment follows, as he speaks: after his own move or theirs. */
export type MomentSeat = 'own' | 'theirs';

export interface FactMoment {
  seat: MomentSeat;
  phase: GamePhase;
}

type Table = Record<string, Record<string, number>>;
const FILE = WEIGHTS as { kindWeights: Table };
/** Per kind of fact: how often he made any of its teaching moves when that
 *  computer had it to say — read first, so a kind is weighed as itself, never
 *  as the best of the moves it might make. */
const BY_KIND: Table = FILE.kindWeights;
const ALL_KINDS = BY_KIND['*'] ?? {};

/** How often he says this kind of fact in this kind of moment, 0–1 — read
 *  only where his positions MEASURED the kind (`kindWeights`). A kind they
 *  never offered returns null and keeps its lane's own number: a teaching
 *  move's rate is a proxy that over-rates a generic line (a behavior tip read
 *  as a plan), so it is never used in a kind's place. Learn's own kinds are
 *  measured by replaying his training games (scripts/scoreboard). */
export function learnedRate(kind: CoachFactKind, moment: FactMoment): number | null {
  if (ALL_KINDS[kind] === undefined) return null;
  return BY_KIND[`${moment.seat}|${moment.phase}`]?.[kind] ?? ALL_KINDS[kind];
}

/** The top of the lead scale: the rate at the 90th percentile of the measured
 *  kinds (a rare kind at 0.67 must not squash the rest). */
const TOP_RATE = ((): number => {
  const all = Object.values(ALL_KINDS).sort((a, b) => a - b);
  return Math.max(1e-6, all[Math.floor(0.9 * (all.length - 1))] ?? 1e-6);
})();

/** A rate on the door's lead scale (the range the hand lanes spanned), so a
 *  learned lead sits beside the lanes that still carry no teaching move. */
export const LEAD_FLOOR = 25;
export const LEAD_CEIL = 76;
export function learnedLead(rate: number): number {
  return LEAD_FLOOR + Math.min(1, rate / TOP_RATE) * (LEAD_CEIL - LEAD_FLOOR);
}

/** He essentially never makes this kind's teaching move in this phase — its
 *  rate here is under a tenth of its rate in the phase where he makes it most
 *  (same seat). Null when the kind is not measured: its lane's own phase rule
 *  stands. */
export const OUT_OF_PHASE_SHARE = 0.1;
const PHASES: readonly GamePhase[] = ['opening', 'middlegame', 'endgame'];
export function learnedOutOfPhase(kind: CoachFactKind, moment: FactMoment): boolean | null {
  const here = learnedRate(kind, moment);
  if (here === null) return null;
  const peak = Math.max(...PHASES.map((phase) => learnedRate(kind, { seat: moment.seat, phase }) ?? 0));
  return peak > 0 && here < OUT_OF_PHASE_SHARE * peak;
}
