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

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface MoveTiming {
  san: string;
  /** The opponent capture that would have won material a move earlier. */
  reply: string;
  piece: string;
  square: string;
}

/** The best material-winning capture for the side to move, or null. */
function bestWin(c: Chess): { san: string; piece: string; square: string; gain: number } | null {
  let best: { san: string; piece: string; square: string; gain: number; by: number } | null = null;
  // The exchange the SEE counts starts with the CHEAPEST capturer, so that is
  // the capture named (review walk 2026-10-04, 17.Bxb3: "a move earlier,
  // their queen would have taken on b3" — the a-pawn takes there; c2 guards
  // b3 against the queen).
  const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured || m.captured === 'k') continue;
    const gain = legalSeeGain(c.fen(), m.to);
    if (gain < 2) continue;
    const by = VAL[m.piece] ?? 100;
    if (!best || gain > best.gain || (gain === best.gain && m.to === best.square && by < best.by)) {
      best = { san: m.san, piece: m.captured, square: m.to, gain, by };
    }
  }
  return best ? { san: best.san, piece: best.piece, square: best.square, gain: best.gain } : null;
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
  const mover = now.turn();
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
  // THE PIECE IT SAVED MUST STILL BE THERE (review walk 2065, 2026-09-26: on
  // Nf3, "a move earlier, Kxf7 would have won your bishop" — the bishop had
  // left f7 the move before and was gone). The lesson is "this move is safe
  // NOW because of what you did first"; if that piece is no longer on the
  // square, the sentence points at nothing on the board.
  const stands = now.get(then.square as Square);
  if (!stands || stands.type !== then.piece || stands.color !== mover) return null;
  return { san, reply: then.san, piece: then.piece, square: then.square };
}

export function timingClause(t: MoveTiming): string {
  // No "<piece> on <square>": the square describes the HYPOTHETICAL board a
  // move earlier, and read against the real one it is a false claim (the
  // corpus sweep caught "your queen on f6" where a knight stood). The square
  // is the facet's highlight instead.
  // Led by a word, never the SAN: spoken, the SAN expands to lowercase words
  // ("bishop to a5 now…") and the sentence opens uncapitalised.
  // The reply is named by its PIECE, not its SAN — "a move earlier, Qxa8 would
  // have won your queen" after Qxa8 read as the same move twice (1200 review
  // walk 2026-09-27). The square it lands on is the hypothetical's, not a
  // claim about a piece standing there now.
  const by = /^[NBRQK]/.test(t.reply) ? NAME[t.reply[0].toLowerCase()] ?? 'piece' : 'pawn';
  return `The timing of ${t.san} matters — a move earlier, their ${by} would have taken on ${t.square} and won your ${NAME[t.piece] ?? 'piece'}`;
}
