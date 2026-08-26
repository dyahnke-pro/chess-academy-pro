// reviewTurningPoint — the end-of-review "where did this game turn?" question
// (David 2026-07-11, approved with the review-questions design). Pure fact-
// computer over the review walk's segments: the candidates and the answer are
// COMPUTED from the eval record (G0) — the student self-assesses, the board
// grades. The question is asked once per game, at the end of the walk.
//
// IMPORTANCE MODEL (David 2026-08-26 — CLAUDE.md "THE COMPUTER DECIDES WHAT IS
// SPOKEN"). Which swings count as turning points is now RATING-SCALED (a
// 2-pawn swing is a must-know for a 1200; a 0.5 subtlety is for a 2200 —
// `criticalityThresholds`) and CONTESTED-GATED: a blowout that stays a blowout
// (+8→+5, both sides still decided the same way) never "turned"; throwing a
// won game (+8→−2) did. A flat 1.0-pawn threshold caught the first as loudly
// as the second, and treated every rating the same.

import { criticalityThresholds } from './criticalityScan';

/** A position is decided when |eval| clears this (white-POV cp). */
const DECIDED_CP = 600;
/** Both endpoints decided for the SAME side — the game never turned here. */
function decidedSameSide(beforeCp: number, afterCp: number): boolean {
  return Math.abs(beforeCp) >= DECIDED_CP && Math.abs(afterCp) >= DECIDED_CP
    && Math.sign(beforeCp) === Math.sign(afterCp);
}

export interface TurningPointSegmentLike {
  ply: number;
  moveNumber: number;
  san: string;
  playerColor: 'white' | 'black';
  /** White-POV centipawns, as the review walk carries them. */
  evalBefore: number | null;
  evalAfter: number | null;
  classification: string | null;
  /** The position the mover FACED (before the move) — so the card can preview
   *  the board at a candidate before the student commits (David 2026-07-19:
   *  "give board context, step the board to each candidate"). */
  fenBefore?: string;
}

export interface TurningPointCandidate {
  ply: number;
  /** Display label, e.g. "18… Rd8". */
  label: string;
  /** The move's cost to its mover, in pawns (always > 0 for candidates). */
  swingPawns: number;
  /** The position to preview when this chip is tapped (before commit). */
  fenBefore?: string;
}

export interface TurningPointQuestion {
  question: string;
  /** Up to 4 candidate moments, in game order. */
  candidates: TurningPointCandidate[];
  /** The computed answer — the game's biggest single swing. */
  answer: TurningPointCandidate;
  /** Reveal spoken after the student commits, correct or not. */
  reveal: string;
}

/** Rating-scaled min mover-POV cost (pawns) for a turning-point candidate.
 *  Intermediate (1500) → 1.0 (the old flat bar); beginner (900) → 2.0 (only
 *  real blunders); expert (2200) → 0.5 (subtleties turn their games). */
export function minSwingPawns(rating: number): number {
  return criticalityThresholds(rating).critical / 100;
}
/** The question needs a real choice — at least this many candidates. */
export const TURNING_POINT_MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 4;

function moveLabel(s: TurningPointSegmentLike): string {
  return `${s.moveNumber}${s.playerColor === 'black' ? '…' : '.'} ${s.san}`;
}

/** The move's cost to the side that played it, in pawns (mover POV). */
function swingPawns(s: TurningPointSegmentLike): number | null {
  if (typeof s.evalBefore !== 'number' || typeof s.evalAfter !== 'number') return null;
  const sign = s.playerColor === 'white' ? 1 : -1;
  const cost = (s.evalBefore - s.evalAfter) * sign;
  return cost > 0 ? cost / 100 : null;
}

/**
 * Compute the question, or null when the game doesn't support one (fewer than
 * two costed moments — a clean game has no turning point to find, and a
 * one-blunder game answers itself). Empty > generic > invented.
 */
export function buildTurningPointQuestion(
  segments: ReadonlyArray<TurningPointSegmentLike>,
  rating = 1500,
): TurningPointQuestion | null {
  const minSwing = minSwingPawns(rating);
  const costed: TurningPointCandidate[] = [];
  for (const s of segments) {
    const swing = swingPawns(s);
    if (swing === null || swing < minSwing) continue;
    // Contested gate: a blowout that stayed a blowout (both endpoints decided
    // for the same side) never turned — skip it. Throwing a won game, or any
    // swing that crosses into/out of contested territory, is kept.
    if (typeof s.evalBefore === 'number' && typeof s.evalAfter === 'number'
      && decidedSameSide(s.evalBefore, s.evalAfter)) continue;
    costed.push({ ply: s.ply, label: moveLabel(s), swingPawns: swing, fenBefore: s.fenBefore });
  }
  if (costed.length < TURNING_POINT_MIN_CANDIDATES) return null;

  const bySwing = [...costed].sort((a, b) => b.swingPawns - a.swingPawns);
  const answer = bySwing[0];
  const candidates = bySwing.slice(0, MAX_CANDIDATES).sort((a, b) => a.ply - b.ply);

  return {
    question: 'One more thing — where do you think this game turned?',
    candidates,
    answer,
    reveal:
      `The turning point was ${answer.label} — the game's biggest single swing, ` +
      `about ${answer.swingPawns.toFixed(1)} pawns.`,
  };
}

/** Grade a pick. The reveal is the same either way; this feeds the spoken
 *  lead-in and analytics. */
export function judgeTurningPointPick(q: TurningPointQuestion, pickedPly: number): boolean {
  return pickedPly === q.answer.ply;
}
