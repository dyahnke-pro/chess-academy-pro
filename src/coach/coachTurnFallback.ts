/**
 * Coach-turn Level-3 emergency move picker. WO-COACH-RESILIENCE.
 *
 * Last-resort deterministic move selection when the spine has timed
 * out twice (primary 15s + Level 1 stockfish-bypass 10s) and the
 * Level 2 LLM-only retry also stalled. The student is staring at a
 * silent board waiting for the coach; we MUST play something.
 *
 * Selection rules, in order:
 *   1. Symmetric reply on move 1: e4→e5, d4→d5, Nf3→Nf6 (the three
 *      most common opening first moves get a natural symmetric
 *      response). Prefer those exact moves when legal.
 *   2. Prefer knight moves from chess.js's verbose move list — the
 *      most "developing" piece moves available, and feel like
 *      reasonable opening moves even mid-game.
 *   3. Then prefer pawn moves.
 *   4. Then fall back to first legal move — guaranteed to exist on
 *      any non-checkmate / non-stalemate position.
 *
 * Returns null only when chess.js itself rejects the FEN or the
 * position has no legal moves (checkmate / stalemate, in which case
 * the game is already over and the coach-turn pipeline shouldn't
 * have reached this layer).
 */
import { Chess } from 'chess.js';

export function emergencyPickMove(
  fen: string,
  moveHistory: readonly string[],
): string | null {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    // Rule 1 — symmetric reply on move 1
    if (moveHistory.length === 1) {
      const last = moveHistory[0];
      if (last === 'e4' && moves.some((m) => m.san === 'e5')) return 'e5';
      if (last === 'd4' && moves.some((m) => m.san === 'd5')) return 'd5';
      if (last === 'Nf3' && moves.some((m) => m.san === 'Nf6')) return 'Nf6';
    }

    // Rule 2 — first knight move
    const knight = moves.find((m) => m.piece === 'n');
    if (knight) return knight.san;

    // Rule 3 — first pawn move
    const pawn = moves.find((m) => m.piece === 'p');
    if (pawn) return pawn.san;

    // Rule 4 — first legal move (always succeeds because moves.length > 0)
    return moves[0]?.san ?? null;
  } catch {
    return null;
  }
}
