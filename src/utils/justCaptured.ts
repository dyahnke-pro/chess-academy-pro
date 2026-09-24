import { Chess } from 'chess.js';

/** Did the LAST move of `history` capture onto `square`? A piece that just took
 *  and stands undefended is a trade coming back, not a prize (hand walk
 *  2026-09-24: 18…Bxf3 announced as "there's something to win here"). */
export function lastMoveCapturedOn(history: readonly string[], square: string): boolean {
  try {
    const c = new Chess();
    let last: ReturnType<Chess['move']> | null = null;
    for (const san of history) last = c.move(san);
    return !!last?.captured && last.to === square;
  } catch { return false; }
}
