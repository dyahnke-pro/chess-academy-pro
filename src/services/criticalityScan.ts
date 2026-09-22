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
// 🔒 THE BARS ARE BAND-FREE (B6, 2026-09-22; CLAUDE.md THE FOUNDATION: "the
// rating's real job is STRENGTH, not volume — it must never decide how much the
// coach SAYS"). They used to scale with the rating band (200 / 100 / 50 for
// beginner / intermediate / advanced), which was the rating deciding VOLUME
// through the back door: a 1.2-pawn swing was a moment for a 1500 and silence
// for a 900, with the same board in front of both. What decides WHETHER a
// moment is worth anything is the REAL centipawn cost against the engine and
// the student's own record (need, the heat map); the rating may scale DEPTH
// (how far a line is walked, `pvDepthForRating`) and never the bar. The
// numbers are the app's ONE move-quality vocabulary (`engineConstants`), so a
// "mistake" here is a mistake in the review's labels and in the coach's mouth.
//
// 100% engine. The MultiPV evaluate is dependency-injected so the core is pure
// and unit-testable (G0); production wires it to stockfishEngine (MultiPV), the
// LLM is nowhere near it.

import { Chess } from 'chess.js';
import type { Color } from 'chess.js';
import { INACCURACY_CP, MISTAKE_CP, BLUNDER_CP } from './engineConstants';

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
  /** How many engine lines to request. Default 3. */
  multiPV?: number;
  /** Explicit overrides (cp). Otherwise the band-free bars below. */
  criticalCp?: number;
  onlyMoveCp?: number;
}

/** The gap / swing bars (cp), the same for every student — see the header.
 *  `notable` / `critical` / `blunder` ARE the inaccuracy / mistake / blunder
 *  bands, so one Stockfish number means one word everywhere; `onlyMove` is
 *  the cliff where the field measurably loses. */
export function criticalityThresholds(): { notable: number; critical: number; onlyMove: number; blunder: number } {
  return { notable: INACCURACY_CP, critical: MISTAKE_CP, onlyMove: ONLY_MOVE_CP, blunder: BLUNDER_CP };
}
/** An only-move is an only-move for everyone — the field has to truly fall off
 *  a cliff. */
export const ONLY_MOVE_CP = 250;

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

  const th = criticalityThresholds();
  const criticalCp = opts.criticalCp ?? th.critical;
  const onlyMoveCp = opts.onlyMoveCp ?? th.onlyMove;

  const isOnlyMove = gapCp >= onlyMoveCp;
  const isCritical = gapCp >= criticalCp;
  const severity: Severity = isOnlyMove ? 'only-move' : gapCp >= criticalCp ? 'critical' : gapCp >= th.notable ? 'notable' : 'none';

  return { fen, mover, best, runnerUp, gapCp, candidates, isCritical, isOnlyMove, severity };
}
