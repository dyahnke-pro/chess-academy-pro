// WHAT A MOVE COST, FROM ONE SEARCH (WO-OUTCOME-01, Learn walk oct3c). The
// cost of a move is the gap between it and the best move INSIDE ONE SEARCH.
// Learn used to subtract a read of the position before the move from a
// separate, time-boxed read after it, and the two disagreed by a pawn or more:
// "Qd3 cost more than a pawn" (one search: 0.5), "b5 cost about a pawn" (2.4),
// "their a4 is a touch inaccurate" (2.0). Same disease the refuted alternative
// had (root fix 1), same cure: score both moves in the same tree.
//
// The fan the surface already paid for is that search when it holds both
// moves; otherwise the two are scored together with `searchmoves`.
import { Chess } from 'chess.js';
import type { MoveScorer, ScoredMove } from './pvPlayback';
import { alternativeCostCp } from './refutedAlternativeCore';
import type { CoachGameMove, KeyMoment } from '../types';

export interface CostFan {
  topLines?: ReadonlyArray<{ evaluation: number; mate: number | null; moves: readonly string[] }>;
  /** How deep the fan's search went. A fan short of the asked depth (a
   *  time-boxed read) is not trusted for a cost (walk oct3e: "Their Kg2 is a
   *  touch inaccurate" off a 1.5 s read; one deep search: 2.1 pawns). */
  depth?: number;
}

/** The best move's and the played move's scores, White POV, from ONE search
 *  — the pair every band is graded from. Never rebuilt from a cost and a
 *  separate read (`inaccuracyCall` used to: "after + cost" mixed two searches,
 *  and Rxb2's word flipped with whichever read finished). */
export interface SameSearchScores { bestWhiteCp: number; playedWhiteCp: number }

/** A live move's ONE price (`playedMoveGrade.liveMovePrice`): what it cost
 *  its mover against the best move inside one search (cp, >= 0) and, when both
 *  moves were scored as centipawns in that search, those two White-POV scores,
 *  so the band ("inaccuracy" / "mistake") is graded from the tree the cost came
 *  from. Null scores: the played move was the fan's best (cost 0 by definition)
 *  on a read too shallow or mate-scored to quote. Every live surface reads a
 *  move's cost from this one shape — never from a read before minus a read after. */
export interface MovePrice {
  costCp: number;
  scores: SameSearchScores | null;
}

/** A move that walked into, or let slip, a forced mate has no centipawn price
 *  (`liveMovePrice` returns null there): its cost is the mate swing the two
 *  reads' mate sentinels carry, mover POV. The ONE place a live surface may
 *  subtract two reads — and only when a mate is on the board. */
export function mateSwingCostCp(beforeMoverCp: number, afterMoverCp: number): number {
  return beforeMoverCp - afterMoverCp;
}

/** The played move and the best move scored in ONE search: the cost (mover's
 *  seat, >= 0) and both White-POV scores, so a grade read off win chances
 *  reads the same tree the cost came from (review walk oct3b: "Qd3 … costing
 *  about 1.3 points" off two separate reads; one search: 0.55). Null when it
 *  cannot be read from one search, or when either move leads to mate (the
 *  mate fields carry that story, never the centipawns). */
export async function moveScoresOneSearch(input: {
  fenBefore: string;
  playedUci: string;
  /** The read at `fenBefore` the surface already has; its best line names the best move. */
  fan: CostFan | null;
  scorer: MoveScorer;
  depth: number;
}): Promise<{ costCp: number; bestWhiteCp: number; playedWhiteCp: number } | null> {
  const lines = (input.fan?.topLines ?? []).filter((l) => l.moves.length > 0);
  const bestUci = lines[0]?.moves[0];
  if (!bestUci) return null;
  const mover: 'w' | 'b' = input.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  const deepEnough = (input.fan?.depth ?? 0) >= input.depth;
  if (bestUci === input.playedUci) {
    const l = lines[0];
    return deepEnough && l.mate == null ? { costCp: 0, bestWhiteCp: l.evaluation, playedWhiteCp: l.evaluation } : null;
  }
  const inFan = deepEnough ? lines.find((l) => l.moves[0] === input.playedUci) : undefined;
  let scored: readonly ScoredMove[];
  if (inFan) {
    scored = lines.map((l) => ({ evaluation: l.evaluation, mate: l.mate, moves: [...l.moves] }));
  } else {
    try { scored = await input.scorer.scoreMoves(input.fenBefore, [bestUci, input.playedUci], input.depth); } catch { return null; }
  }
  const best = scored.find((l) => l.moves[0] === bestUci);
  const played = scored.find((l) => l.moves[0] === input.playedUci);
  if (!best || !played || best.mate != null || played.mate != null) return null;
  // best minus played, from the mover's seat.
  const cost = alternativeCostCp(bestUci, input.playedUci, scored, mover);
  if (cost === null) return null;
  return { costCp: Math.max(0, cost), bestWhiteCp: best.evaluation, playedWhiteCp: played.evaluation };
}


/** The UCI of a SAN move on `fen`, or null when it is not legal there. */
export function uciOfSan(fen: string, san: string): string | null {
  try {
    const m = new Chess(fen).move(san);
    return m ? `${m.from}${m.to}${m.promotion ?? ''}` : null;
  } catch { return null; }
}

/** WHAT A RECORDED MOVE COST — the one door for every reader of an analysed
 *  move's cost. The one-search cost when the analysis stored it (`costCp`);
 *  otherwise, on an annotation older than that, the eval delta it had. Mover's
 *  seat, >= 0; null when neither is known. */
export function recordedMoveCost(
  m: { costCp?: number; preMoveEval: number | null; evaluation: number | null },
  mover: 'white' | 'black',
): number | null {
  if (typeof m.costCp === 'number') return m.costCp;
  if (m.preMoveEval == null || m.evaluation == null) return null;
  return Math.max(0, mover === 'white' ? m.preMoveEval - m.evaluation : m.evaluation - m.preMoveEval);
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
