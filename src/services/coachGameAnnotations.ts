import type { CoachGameMove, MoveAnnotation } from '../types';

/** Depth the live `/coach/play` classifier searches at (see CoachGamePage:
 *  `analyzePosition(fen, 10)` before + after every student move). Stamped on
 *  the saved record so `gameNeedsAnalysis` reads a coach game as ANALYSED
 *  (the batch sweep leaves it alone) but still below the review ceiling, so
 *  opening it deep-dives the key moments — in the background, never blocking. */
export const LIVE_ANALYSIS_DEPTH = 10;

/**
 * The in-game analysis IS the review's analysis for a coach game (David
 * 2026-09-05: "can we also use in game analysis to prevent any need for
 * preview analysis?"). Every student ply was scored live at depth 10 before
 * and after; every coach ply carries the eval the coach's own turn computed.
 * Filing BOTH sides gives the review a continuous eval curve with no engine
 * pass at all.
 *
 * 🚨 The coach's CHOSEN move is rating-throttled and must never be filed as
 * a "best move": a coach ply gets `bestMove: null` and a neutral grade. Only
 * the STUDENT's `bestMove` — which the live classifier read from the honest
 * pre-move `analyzePosition` search, never from the coach-move picker — is
 * kept.
 */
export function movesToAnnotations(moves: CoachGameMove[], playerColor: 'white' | 'black'): MoveAnnotation[] {
  const coachColor: 'white' | 'black' = playerColor === 'white' ? 'black' : 'white';
  const out: MoveAnnotation[] = [];
  for (const m of moves) {
    if (m.isCoachMove) {
      // Evaluated live? File the eval so the curve is continuous. A coach ply
      // with no eval (engine timeout) is skipped — a null pair grades `good`
      // downstream, never a false flag.
      if (m.evaluation === null) continue;
      out.push({
        moveNumber: Math.ceil(m.moveNumber / 2),
        color: coachColor,
        san: m.san,
        evaluation: m.evaluation,
        bestMove: null,
        bestMoveEval: m.bestMoveEval,
        classification: m.classification ?? 'good',
        comment: null,
      });
      continue;
    }
    if (m.classification === null) continue;
    out.push({
      moveNumber: Math.ceil(m.moveNumber / 2),
      color: playerColor,
      san: m.san,
      // Both values are already centipawns (White POV) from the live
      // CoachGamePage classifier — pass through unchanged so the review
      // surface's swing math matches the live game's classifier output.
      evaluation: m.evaluation,
      bestMove: m.bestMove,
      bestMoveEval: m.bestMoveEval,
      classification: m.classification,
      comment: m.commentary || null,
    });
  }
  return out;
}
