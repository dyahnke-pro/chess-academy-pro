// THE ENGINE'S LINE FROM THE BEST MOVE, read off a stored annotation — the ONE
// line shape every record reader takes (WO-MOTIFS-01 M3d). The annotation
// keeps the line AFTER the best move (`pv.afterBest`); three readers were
// handed that bare continuation as if it began with the best move — the king
// reads played the opponent's reply as the student's move, and the tactic
// backfill's line never matched its own best move — so each read nothing.
import { Chess } from 'chess.js';
import type { MoveAnnotation } from '../types';

/** The best move and the line after it (UCI), or undefined when the
 *  annotation kept no line. */
export function bestLineOf(ann: Pick<MoveAnnotation, 'bestMove' | 'pv'>): string[] | undefined {
  return ann.bestMove && ann.pv?.afterBest.length ? [ann.bestMove, ...ann.pv.afterBest] : undefined;
}

/** How far a game's own continuation is read to name a FOUND shot: the set-up,
 *  their answer, the payoff and the recapture, with room for a check. */
export const GAME_LINE_PLIES = 8;

/** The game's own moves from a position (SAN, the move played first) as a UCI
 *  line — what a found shot is named off: the move, then what the game did
 *  with it. Undefined under three plies (no line to read). */
export function gameLineFrom(fen: string, sans: readonly string[]): string[] | undefined {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const san of sans.slice(0, GAME_LINE_PLIES)) {
      const m = c.move(san);
      out.push(`${m.from}${m.to}${m.promotion ?? ''}`);
    }
  } catch { /* keep what played */ }
  return out.length >= 3 ? out : undefined;
}
