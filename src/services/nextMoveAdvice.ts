// nextMoveAdvice — does THIS moment earn naming the student's next move?
//
// David 2026-09-24: "I don't want to hear the best move on every ply. That
// needs to algo to the user … key moments where the user generally makes
// mistakes." On the live board the move-choice lines (the weighing + "the move
// is X — reason", the but-turn, the hedge, the compare) fired on nearly every
// student ply, so the best move became background noise.
//
// Two ways to earn it, and neither is the rating (a rating sets how hard the
// opponent plays, never how much the coach says):
//   1. THE BOARD — a deciding moment. The importance model already computed it
//      (only-move, critical, swing, blunder, mate); on a flat position where
//      several moves are equal, naming "the move" teaches nothing.
//   2. THE STUDENT'S OWN RECORD — raise-only. They have open mistakes in this
//      PHASE (the spine files every mistake under the same `classifyPhase` the
//      board is read with here), or a recorded hole this position's facts hit
//      (the need score's own join, handed in pre-matched — never a second
//      table). A beginner who keeps erring in the opening gets the opening
//      advised because THEIR record says so, not because of a band.
// An empty record (a fresh install) reads the board alone: real forks in the
// road still name the move; everything else keeps teaching the position.
//
// A LEAF: no db, no store — the caller hands in what it already holds.

import type { ImportanceTier } from './narrationImportance';
import type { WeaknessSignal } from './weaknessSignal';
import type { GamePhase } from '../types';

export type MoveAdviceReason = 'deciding' | 'phase-record' | 'motif-record';

export interface MoveAdviceVerdict {
  speak: boolean;
  /** Which arm earned it; null when neither did. Emitted on the decision row. */
  reason: MoveAdviceReason | null;
}

/** The tiers where the move choice DECIDES something. A `Record` over the whole
 *  union, so a new tier fails to compile until someone answers for it. One list
 *  for every live computer that must not fire on routine plies (the method
 *  habits read it too). */
const DECIDING: Record<ImportanceTier, boolean> = {
  mate: true,
  'only-move': true,
  blunder: true,
  critical: true,
  swing: true,
  'must-defend': false,
  teaching: false,
  convert: false,
  none: false,
};

export function isDecidingMoment(tier: ImportanceTier | undefined): boolean {
  return tier ? DECIDING[tier] : false;
}

/** A hole that is still open — something the student keeps getting wrong. A
 *  lifecycle-`fixed` hole is history, not need. */
function isOpenHole(s: WeaknessSignal): boolean {
  return s.openCount > 0 && s.lifecycleStatus !== 'fixed';
}

/** Does the record hold open mistakes in THIS phase? The spine files a phase
 *  mistake under `analysis:phase:<phase>`, the opening under bucket `opening`,
 *  the endgame under `endgame` (typed endings included). */
export function phaseHole(phase: GamePhase, weaknesses: readonly WeaknessSignal[]): WeaknessSignal | null {
  return weaknesses.find((s) => isOpenHole(s) && (
    s.clusterId === `analysis:phase:${phase}`
    || (phase === 'opening' && s.bucket === 'opening')
    || (phase === 'endgame' && s.bucket === 'endgame')
  )) ?? null;
}

export function nextMoveAdvice(input: {
  tier: ImportanceTier;
  phase: GamePhase;
  weaknesses: readonly WeaknessSignal[];
  /** The hole this position's facts hit, from the need score's own join
   *  (`needClauseFor`), or null. */
  motifHole: WeaknessSignal | null;
}): MoveAdviceVerdict {
  if (isDecidingMoment(input.tier)) return { speak: true, reason: 'deciding' };
  if (phaseHole(input.phase, input.weaknesses)) return { speak: true, reason: 'phase-record' };
  if (input.motifHole && isOpenHole(input.motifHole)) return { speak: true, reason: 'motif-record' };
  return { speak: false, reason: null };
}
