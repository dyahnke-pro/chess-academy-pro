// moveTiming — "b4 is finally right: a move earlier it would have run into a
// queen check on b3" (WO-LAYERS-01 step 7).
//
// A strong player's understanding of WHEN is the plan layer's last piece: the
// right move played a turn early loses. Board-only (chess.js): replay the same
// move from the student's PREVIOUS turn; if the opponent could then win
// material with a capture that no longer wins anything now, the student's
// in-between move is what made it work — and that is the lesson.
import { Chess, type Square } from 'chess.js';
import { legalSeeGain, legalSeeGainFor } from './positionReadingService';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

export interface MoveTiming {
  san: string;
  /** The opponent capture that would have won material a move earlier. */
  reply: string;
  piece: string;
  square: string;
}

/** The best material-winning capture for the side to move, or null. */
function bestWin(c: Chess): { san: string; piece: string; square: string; gain: number } | null {
  let best: { san: string; piece: string; square: string; gain: number } | null = null;
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured || m.captured === 'k') continue;
    const gain = legalSeeGain(c.fen(), m.to);
    if (gain >= 2 && (!best || gain > best.gain)) best = { san: m.san, piece: m.captured, square: m.to, gain };
  }
  return best;
}

/**
 * `fenEarlier` is the board at the student's PREVIOUS turn, `fenNow` the board
 * before the move actually played. Null unless the move was legal earlier, lost
 * material then, and does not now.
 */
export function readTiming(fenEarlier: string, fenNow: string, san: string): MoveTiming | null {
  let early: Chess;
  let now: Chess;
  try { early = new Chess(fenEarlier); now = new Chess(fenNow); } catch { return null; }
  if (early.turn() !== now.turn()) return null;
  try { if (!early.move(san)) return null; } catch { return null; }
  try { if (!now.move(san)) return null; } catch { return null; }
  const then = bestWin(early);
  if (!then) return null;
  // CAUSED BY THE MOVE: the same target was not already winnable at the
  // earlier board — otherwise it was hanging anyway and timing is not the point.
  const opp = early.turn();
  if (legalSeeGainFor(fenEarlier, then.square as Square, opp) >= then.gain) return null;
  const nowWin = bestWin(now);
  if (nowWin && nowWin.gain >= then.gain) return null;
  return { san, reply: then.san, piece: then.piece, square: then.square };
}

export function timingClause(t: MoveTiming): string {
  // No "<piece> on <square>": the square describes the HYPOTHETICAL board a
  // move earlier, and read against the real one it is a false claim (the
  // corpus sweep caught "your queen on f6" where a knight stood). The square
  // is the facet's highlight instead.
  return `${t.san} now, not a move earlier — then ${t.reply} would have won your ${NAME[t.piece] ?? 'piece'}`;
}
