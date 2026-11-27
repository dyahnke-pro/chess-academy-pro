// THE IMMEDIATE WIN — what the side to move wins with ONE move on `fen`: a
// mate, a promotion they cannot take back, or the best capture counted to the
// end of its trades (legal SEE). The one read the threat computers share: the
// discovered attack (`discoveredAttack`), your own threat (`ownThreat`) and the
// answering move (`answeringMove`) each ask "what does this side win now?" of
// a board, so they count it the same way.
//
// PURE: chess.js and the legal exchange count.
import { Chess } from 'chess.js';
import { legalSeeGain } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';

/** The mate's worth on the pawn scale: more than every piece on the board. */
export const MATE_GAIN = 99;

export interface ImmediateWin {
  /** Pawns won (MATE_GAIN for a mate); 0 when nothing wins. */
  gain: number;
  /** The move that wins it, SAN; null when nothing wins. */
  san: string | null;
  from: string | null;
  to: string | null;
  mate: boolean;
  /** The piece it wins (the capture's target), null for a mate. */
  won: { square: string; piece: string } | null;
}

const NOTHING: ImmediateWin = { gain: 0, san: null, from: null, to: null, mate: false, won: null };

/** THE MOST THE SIDE TO MOVE WINS WITH ONE MOVE on `fen`. `except`: a square
 *  whose capture is already counted (an exchange the caller summed there). */
export function immediateWin(fen: string, except: string | null = null): ImmediateWin {
  let c: Chess;
  try { c = new Chess(fen); } catch { return NOTHING; }
  if (c.isGameOver()) return NOTHING;
  let best: ImmediateWin = NOTHING;
  // The cheapest capturer first: the exchange count takes with it, so the move
  // named is the one the count is about.
  const moves = c.moves({ verbose: true }).sort((a, b) => (MATERIAL_VALUE[a.piece] ?? 0) - (MATERIAL_VALUE[b.piece] ?? 0) || (a.piece === 'k' ? 1 : 0) - (b.piece === 'k' ? 1 : 0));
  // One exchange count per square (the cheapest capturer comes first).
  const seen = new Set<string>();
  for (const m of moves) {
    // chess.js marks a mate in the SAN itself: no board is built for the read.
    if (m.san.endsWith('#')) return { gain: MATE_GAIN, san: m.san, from: m.from, to: m.to, mate: true, won: null };
    // A promotion they cannot take back at once wins the new queen's worth.
    if (m.promotion) {
      const b = new Chess(fen);
      b.move(m.san);
      if (b.attackers(m.to, b.turn()).length === 0) {
        const g = (MATERIAL_VALUE[m.promotion] ?? 0) - 1 + (m.captured ? MATERIAL_VALUE[m.captured] ?? 0 : 0);
        if (g > best.gain) best = { gain: g, san: m.san, from: m.from, to: m.to, mate: false, won: { square: m.to, piece: m.promotion } };
      }
    }
    if (!m.captured || m.to === except || seen.has(m.to)) continue;
    seen.add(m.to);
    const g = legalSeeGain(fen, m.to);
    if (g > best.gain) best = { gain: g, san: m.san, from: m.from, to: m.to, mate: false, won: { square: m.to, piece: m.captured } };
  }
  return best;
}
