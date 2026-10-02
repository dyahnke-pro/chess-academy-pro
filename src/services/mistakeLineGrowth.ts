/**
 * mistakeLineGrowth — a mistake puzzle that GROWS one move each time you
 * solve it (David 2026-10-01: "Can we build puzzles from my mistakes that grow
 * in length?").
 *
 *   first time  → find the move you missed;
 *   solved      → next time it continues: their best reply, your follow-up;
 *   keeps going → until the line stops being FORCED;
 *   a miss      → it drops back one move.
 *
 * THE HONESTY RULE (agreed with David): the line only grows while each of the
 * student's moves is the ONE good move — the engine's best beats its second
 * best by a clear margin (`scanCriticality` isCritical, the ONE criticality
 * the whole app reads — never a second gap). If two moves both win, the
 * puzzle would mark a winning move wrong, so growth stops there. A hung-queen
 * mistake stays one move, and that is correct.
 *
 * Every extension is the engine's line, chess.js-replayed (G3). The opponent's
 * reply is the engine's best defence, not required to be forced.
 */
import { Chess } from 'chess.js';
import { scanCriticality, type EvaluateMulti } from './criticalityScan';

/** Solver moves required today; absent on rows written before growth = 1. */
export function solveLengthOf(p: { solveLength?: number }): number {
  return Math.max(1, Math.floor(p.solveLength ?? 1));
}

/** A ceiling so a perpetual-ish forced line cannot grow forever. */
export const MAX_SOLVE_LENGTH = 8;

/** The plies the board plays for a length: your moves and their replies in
 *  between, ending on YOUR move. */
export function pliesFor(moves: readonly string[], solveLength: number): string[] {
  return moves.slice(0, Math.min(moves.length, 2 * solveLength - 1));
}

export interface GrowthResult {
  /** The (possibly extended) line, uci. */
  moves: string[];
  solveLength: number;
  /** The line stopped being forced at this length — don't re-scan. */
  cappedAt: number | null;
}

function play(chess: Chess, uci: string): boolean {
  try {
    return !!chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
  } catch {
    return false;
  }
}

/**
 * Grow one move. From the position after your current last move: take their
 * reply (stored, else the engine's best), then require YOUR next move to be the
 * one good move. Returns the line unchanged with `cappedAt` set when it is not.
 */
export async function growOneMove(
  fen: string,
  moves: readonly string[],
  solveLength: number,
  evaluate: EvaluateMulti,
): Promise<GrowthResult> {
  const L = solveLengthOf({ solveLength });
  const unchanged = (capped: boolean): GrowthResult => ({ moves: [...moves], solveLength: L, cappedAt: capped ? L : null });
  if (L >= MAX_SOLVE_LENGTH) return unchanged(true);

  const chess = new Chess(fen);
  const line = moves.slice(0, 2 * L - 1);
  for (const u of line) if (!play(chess, u)) return unchanged(true);
  if (chess.isGameOver()) return unchanged(true); // mate / stalemate — the payoff landed

  // Their reply: the stored line's, if it has one and it is legal.
  let reply = moves[2 * L - 1];
  if (!reply || !play(chess, reply)) {
    const theirs = await scanCriticality(chess.fen(), evaluate, { multiPV: 1 });
    if (!theirs) return unchanged(true);
    reply = theirs.best.uci;
    if (!play(chess, reply)) return unchanged(true);
  }
  if (chess.isGameOver()) return unchanged(true);

  // Your next move must be THE move.
  const yours = await scanCriticality(chess.fen(), evaluate, { multiPV: 2 });
  if (!yours || !yours.isCritical) return unchanged(true);
  const stored = moves[2 * L];
  const next = stored === yours.best.uci ? stored : yours.best.uci;

  return {
    moves: [...line, reply, next],
    solveLength: L + 1,
    cappedAt: null,
  };
}

/** A miss drops the puzzle back one move, never below one. */
export function shrinkOnMiss(solveLength: number | undefined): number {
  return Math.max(1, solveLengthOf({ solveLength }) - 1);
}
