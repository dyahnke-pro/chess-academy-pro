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

export interface CostFan {
  topLines?: ReadonlyArray<{ evaluation: number; mate: number | null; moves: readonly string[] }>;
  /** How deep the fan's search went. A fan short of the asked depth (a
   *  time-boxed read) is not trusted for a cost (walk oct3e: "Their Kg2 is a
   *  touch inaccurate" off a 1.5 s read; one deep search: 2.1 pawns). */
  depth?: number;
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

/** Centipawns the played move gives up against the best one, from the mover's
 *  seat, >= 0 — `moveScoresOneSearch`'s cost. */
export async function moveCostOneSearch(input: {
  fenBefore: string;
  playedUci: string;
  fan: CostFan | null;
  scorer: MoveScorer;
  depth: number;
}): Promise<number | null> {
  const lines = (input.fan?.topLines ?? []).filter((l) => l.moves.length > 0);
  if (lines[0]?.moves[0] && lines[0].moves[0] === input.playedUci) return 0;
  return (await moveScoresOneSearch(input))?.costCp ?? null;
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
