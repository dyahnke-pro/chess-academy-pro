import { Chess } from 'chess.js';
import { legalSeeGainFor } from '../services/positionReadingService';

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

/** MID-EXCHANGE: the last move of `history` captured, and the side now to move
 *  can take back on that square without losing material. Returns that square,
 *  or null. A position mid-exchange is about to change, so a STANDING claim
 *  about it — the material count, a doubled pawn, a missing bishop, a weak
 *  back rank — describes a board that will not exist next move (hand walk
 *  2340: "you're down 3 points of material" one move before Bxc3 was taken
 *  back; "their pawns on the d-file are doubled" as cxd4 recaptured). Standing
 *  reads wait a ply; if they are real they are still true then. */
export function pendingRecapture(history: readonly string[]): string | null {
  try {
    const c = new Chess();
    let last: ReturnType<Chess['move']> | null = null;
    for (const san of history) last = c.move(san);
    if (!last?.captured) return null;
    const retake = c.moves({ verbose: true }).some((m) => m.to === last.to && m.captured);
    if (!retake) return null;
    return legalSeeGainFor(c.fen(), last.to, c.turn()) >= 0 ? last.to : null;
  } catch { return null; }
}

/** The square the move `back` plies from the end of `history` landed on
 *  (`back = 1` is the last move), or null when the history does not replay. */
export function landingSquare(history: readonly string[], back: number): string | null {
  if (history.length < back) return null;
  try {
    const c = new Chess();
    let hit: string | null = null;
    history.forEach((san, i) => { const m = c.move(san); if (i === history.length - back) hit = m.to; });
    return hit;
  } catch { return null; }
}
