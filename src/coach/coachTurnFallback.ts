/**
 * Coach-turn Level-3 emergency move picker. WO-COACH-RESILIENCE.
 *
 * Last-resort deterministic move selection when the spine has timed
 * out twice (primary 15s + Level 1 stockfish-bypass 10s) and the
 * Level 2 LLM-only retry also stalled. The student is staring at a
 * silent board waiting for the coach; we MUST play something.
 *
 * Selection rules, in order:
 *   1. Symmetric reply on move 1: if move history is exactly one
 *      move and it was 1.e4 or 1.d4, mirror with e5 / d5 when legal.
 *      Most natural-feeling fallback for the most common openings.
 *   2. First knight or pawn move from chess.js's verbose move list —
 *      these are the most "developing" moves available and feel
 *      like reasonable opening moves even mid-game.
 *   3. First legal move from chess.js — guaranteed to exist on any
 *      non-checkmate / non-stalemate position.
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
    }

    // Rule 2 — first knight or pawn move
    const knightOrPawn = moves.find((m) => m.piece === 'n' || m.piece === 'p');
    if (knightOrPawn) return knightOrPawn.san;

    // Rule 3 — first legal move (always succeeds at this point because
    // moves.length > 0 was checked above).
    return moves[0]?.san ?? null;
  } catch {
    return null;
  }
}
