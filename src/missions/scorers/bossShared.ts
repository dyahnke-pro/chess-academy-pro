/**
 * The board after a candidate, for the boss scorers. Not a scorer: it
 * registers nothing. Null when the move is not legal on the board.
 */
import { Chess, type Move } from 'chess.js';

export function playCandidate(fen: string, uci: string): { board: Chess; move: Move } | null {
  try {
    const board = new Chess(fen);
    const move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci.length > 4 ? { promotion: uci[4] } : {}) });
    return { board, move };
  } catch {
    return null;
  }
}
