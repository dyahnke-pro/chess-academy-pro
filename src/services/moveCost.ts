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

export interface CostFan { topLines?: ReadonlyArray<{ evaluation: number; mate: number | null; moves: readonly string[] }> }

/** Centipawns the played move gives up against the best one, from the mover's
 *  seat, >= 0. Null when the cost cannot be read from one search, or when
 *  either move leads to mate (the mate fields carry that story, never the
 *  centipawns). */
export async function moveCostOneSearch(input: {
  fenBefore: string;
  playedUci: string;
  /** The read at `fenBefore` the surface already has; its best line names the best move. */
  fan: CostFan | null;
  scorer: MoveScorer;
  depth: number;
}): Promise<number | null> {
  const lines = (input.fan?.topLines ?? []).filter((l) => l.moves.length > 0);
  const bestUci = lines[0]?.moves[0];
  if (!bestUci) return null;
  const mover: 'w' | 'b' = input.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  if (bestUci === input.playedUci) return 0;
  const inFan = lines.find((l) => l.moves[0] === input.playedUci);
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
  return cost === null ? null : Math.max(0, cost);
}

/** The UCI of a SAN move on `fen`, or null when it is not legal there. */
export function uciOfSan(fen: string, san: string): string | null {
  try {
    const m = new Chess(fen).move(san);
    return m ? `${m.from}${m.to}${m.promotion ?? ''}` : null;
  } catch { return null; }
}
