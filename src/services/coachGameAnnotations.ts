import type { CoachGameMove, KeyMoment, MoveAnnotation } from '../types';

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
      // THE ENGINE LINES RIDE ALONG (C3, 2026-09-22) — byte-for-byte the shape
      // the sweep persists (`pv.afterPlayed` / `pv.afterBest`), so the record
      // path attributes a Play game the way it attributes an import. Without
      // them `calculation-depth` declined every Play slip with "punishing PV
      // is 0 plies" — the live classifier had the lines in hand and dropped
      // them at this boundary.
      ...(m.pv ? { pv: m.pv } : {}),
      // The move's ONE price (#2 root cause 4) — the record and review read
      // it (`recordedMoveCost`) instead of rebuilding a cost from two evals.
      ...(typeof m.costCp === 'number' ? { costCp: m.costCp } : {}),
    });
  }
  return out;
}

/** A move that costs two pawns is a key moment whatever the grader called it. */
const KEY_MOMENT_COST_CP = 200;
const KEY_MOMENT_GRADES: ReadonlySet<string> = new Set(['brilliant', 'great', 'blunder', 'mistake']);

/**
 * THE KEY MOMENTS OF A PLAY GAME — every student move that clears the bar,
 * however many that is (G4.5: no cap; 2026-10-20 replaced a top-5 slice that
 * dropped a sixth and seventh moment and filled a quiet game with five). The
 * bar is the move grader's own verdict (a blunder, a mistake, a great or
 * brilliant find) or the move's ONE price (`costCp`, never the swing between
 * two stored evals, which charged the student for the coach's reply). A quiet
 * game has none. In game order.
 */
export function findKeyMoments(moves: readonly CoachGameMove[]): KeyMoment[] {
  return moves
    .filter((m) => !m.isCoachMove)
    .filter((m) => (m.classification !== null && KEY_MOMENT_GRADES.has(m.classification)) || (m.costCp ?? 0) >= KEY_MOMENT_COST_CP)
    .map((m) => ({
      moveNumber: m.moveNumber,
      fen: m.fen,
      explanation: m.commentary || `Move ${m.moveNumber}: ${m.san} — evaluation changed significantly.`,
      type: m.classification === 'brilliant' || m.classification === 'great' ? 'brilliant' as const
        : m.classification === 'blunder' || m.classification === 'mistake' ? 'blunder' as const : 'turning_point' as const,
    }));
}
