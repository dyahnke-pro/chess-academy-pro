// criticalityScan — THE shared engine primitive (David 2026-07-23). One
// computation feeds turning-points, only-moves, AND question-moments: how much
// does the evaluation HINGE on finding the right move? That's the MultiPV
// variance — the gap between the engine's best move and the field.
//
//   • flat  (best ≈ 2nd ≈ 3rd) → nothing hinges → quiet, no question.
//   • gap   (best ≫ 2nd)       → a real decision → question-worthy / critical.
//   • cliff (best ≫≫ field)    → an ONLY move.
//   • a TURNING POINT is just a critical moment where the user went wrong.
//
// The "critical" bar SCALES WITH RATING (a 2-pawn swing is a must-find for a
// 1200; a 0.5 subtlety is for a 2200), so we flag the student's OWN critical
// moments — many, but never spam.
//
// 100% engine. The MultiPV evaluate is dependency-injected so the core is pure
// and unit-testable (G0); production wires it to stockfishEngine (MultiPV), the
// LLM is nowhere near it.

import { Chess } from 'chess.js';
import type { Color } from 'chess.js';

/** One engine candidate at a position — white-POV centipawns (+ = White better;
 *  mates folded into cp by the evaluate implementation). */
export interface RawCandidate {
  uci: string;
  cp: number;
  san?: string;
}

/** The injected MultiPV engine. Returns up to `multiPV` candidate moves with
 *  white-POV cp. Order doesn't matter — we re-sort by the mover's POV. */
export type EvaluateMulti = (fen: string, multiPV: number) => Promise<RawCandidate[]>;

export interface ScoredMove {
  uci: string;
  san: string;
  /** cp from the MOVER's perspective (+ = good for the side to move). */
  moverCp: number;
}

export type Severity = 'none' | 'notable' | 'critical' | 'only-move';

export interface CriticalMoment {
  fen: string;
  mover: Color;
  best: ScoredMove;
  runnerUp: ScoredMove | null;
  /** best.moverCp − runnerUp.moverCp (≥ 0). Infinity when best is the ONLY legal
   *  move — a literal only-move. */
  gapCp: number;
  candidates: ScoredMove[];
  /** The gap clears the rating-scaled "a decision hinges here" bar. */
  isCritical: boolean;
  /** The field falls off a cliff — one move, the rest measurably lose. */
  isOnlyMove: boolean;
  severity: Severity;
}

export interface CriticalityOpts {
  /** Student rating — scales the thresholds. Default 1500 (intermediate). */
  rating?: number;
  /** How many engine lines to request. Default 3. */
  multiPV?: number;
  /** Explicit overrides (cp). Otherwise derived from rating. */
  criticalCp?: number;
  onlyMoveCp?: number;
}

/** Rating-scaled gap thresholds (cp). Mirrors the slip-detector doctrine:
 *  beginner cares about blunders, advanced about subtleties. */
export function criticalityThresholds(rating: number): { notable: number; critical: number; onlyMove: number } {
  const critical = rating < 1000 ? 200 : rating <= 2000 ? 100 : 50;
  const notable = Math.round(critical * 0.6);
  // An only-move is an only-move regardless of level — the field has to truly
  // fall off a cliff — but never below a rating-scaled floor.
  const onlyMove = Math.max(250, critical * 2);
  return { notable, critical, onlyMove };
}

function toSan(fen: string, uci: string): string {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    return m ? m.san : uci;
  } catch {
    return uci;
  }
}

/**
 * Scan a position's criticality via MultiPV variance. Returns null if the FEN
 * is invalid or the engine returned nothing. Everything downstream — turning
 * points, only-moves, question-moments — reads `gapCp` / `isCritical` /
 * `isOnlyMove` off this one result.
 */
export async function scanCriticality(
  fen: string,
  evaluate: EvaluateMulti,
  opts: CriticalityOpts = {},
): Promise<CriticalMoment | null> {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  if (chess.isGameOver()) return null;
  const mover = chess.turn();
  const sign = mover === 'w' ? 1 : -1;
  const legalCount = chess.moves().length;

  const raw = await evaluate(fen, opts.multiPV ?? 3);
  if (!raw.length) return null;

  const candidates: ScoredMove[] = raw
    .map((c) => ({ uci: c.uci, san: c.san ?? toSan(fen, c.uci), moverCp: sign * c.cp }))
    .sort((a, b) => b.moverCp - a.moverCp);

  const best = candidates[0];
  const runnerUp = candidates[1] ?? null;
  // Only ONE legal move → a literal only-move (no runner-up to compare against).
  const gapCp = legalCount === 1 ? Infinity : runnerUp ? best.moverCp - runnerUp.moverCp : Infinity;

  const { rating = 1500 } = opts;
  const th = criticalityThresholds(rating);
  const criticalCp = opts.criticalCp ?? th.critical;
  const onlyMoveCp = opts.onlyMoveCp ?? th.onlyMove;

  const isOnlyMove = gapCp >= onlyMoveCp;
  const isCritical = gapCp >= criticalCp;
  const severity: Severity = isOnlyMove ? 'only-move' : gapCp >= criticalCp ? 'critical' : gapCp >= th.notable ? 'notable' : 'none';

  return { fen, mover, best, runnerUp, gapCp, candidates, isCritical, isOnlyMove, severity };
}
