/**
 * chessSafe
 * ---------
 * Defensive wrappers around chess.js that swallow invalid-FEN and
 * illegal-move exceptions instead of crashing the call site. The
 * chess-correctness audit flagged 10+ raw `new Chess(fen)` sites
 * where a malformed FEN (corrupt import, manual paste, schema drift)
 * would throw all the way out and blank the UI. These helpers give
 * callers a null-returning pattern that's easy to handle gracefully.
 *
 * Use the helpers at service/component boundaries where the FEN comes
 * from user input, imported game data, or LLM output. Internal code
 * that already validated the FEN once can keep using `new Chess(...)`
 * directly.
 */
import { Chess } from 'chess.js';

/**
 * Try to construct a Chess instance from a FEN. Returns null on any
 * error (invalid syntax, bad piece placement, bad side-to-move, etc.)
 * instead of throwing.
 */
export function safeChessFromFen(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

/**
 * Try to play a SAN on a Chess instance. Returns null if the move is
 * illegal OR if chess.js 1.4.0 returns null (older versions threw).
 * Normalises the two failure modes so callers don't have to check
 * both `try/catch` AND `if (m === null)`.
 */
export function safeMoveSan(chess: Chess, san: string): ReturnType<Chess['move']> | null {
  try {
    const m = chess.move(san);
    return m ?? null;
  } catch {
    return null;
  }
}

/**
 * Lightweight FEN-shape validator. True when the string looks like a
 * plausible FEN (6 whitespace-separated fields, board rows that sum
 * to 8 squares each). Does NOT validate full legality — cheaper than
 * constructing a Chess instance, useful for early-rejecting obvious
 * garbage before an expensive pipeline step.
 */
export function isPlausibleFen(fen: string): boolean {
  if (!fen || typeof fen !== 'string') return false;
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) return false;
  const rows = parts[0].split('/');
  if (rows.length !== 8) return false;
  for (const row of rows) {
    let files = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) files += parseInt(ch, 10);
      else if (/[prnbqkPRNBQK]/.test(ch)) files += 1;
      else return false;
    }
    if (files !== 8) return false;
  }
  if (parts[1] !== 'w' && parts[1] !== 'b') return false;
  return true;
}
