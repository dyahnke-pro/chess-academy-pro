// queenGrabTrap — CHECK THE QUEEN'S EXITS BEFORE YOU GRAB (teach-brief §3; the
// poisoned-pawn family: Qxb2 Rb1, the queen walled in on b2).
//
// A capture by the queen that LOOKS free — the piece it takes is not defended
// enough to win it back — but after one reply the queen stands attacked with
// no safe square (`trappedOnBoard`, the same board fact review's trap lane
// reads). DUAL-USE: Learn warns before the grab; a review can name the grab
// that walked into it.
//
// It states the BOARD FACT ("after Rb1 your queen has no safe square"), never
// the outcome ("you lose the queen") — that needs a line that actually takes
// it (WO-OUTCOME-01), which a pre-move warning does not have.
// PURE: chess.js + the existing trap and SEE computers.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { trappedOnBoard } from './reviewTeachingPoints';
import { legalSeeGainFor } from './positionReadingService';

export interface QueenGrabTrap {
  /** The tempting capture. */
  san: string;
  from: Square;
  to: Square;
  captured: PieceSymbol;
  /** The reply that leaves the queen with no safe square. */
  replySan: string;
  replyFrom: Square;
  replyTo: Square;
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** Every queen grab for the side to move that looks free and walks into a
 *  trap; [] when none. */
export function findQueenGrabTraps(fen: string): QueenGrabTrap[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const me: Color = chess.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const out: QueenGrabTrap[] = [];
  for (const m of chess.moves({ verbose: true })) {
    if (m.piece !== 'q' || !m.captured || m.captured === 'q') continue;
    // It must LOOK free: taking it does not lose material on the spot.
    if (legalSeeGainFor(fen, m.to, me) <= 0) continue;
    const after = new Chess(fen);
    after.move(m);
    for (const r of after.moves({ verbose: true })) {
      if (r.captured) continue;   // a capture back is the exchange, not the trap
      after.move(r);
      // A trap needs the queen attacked; most replies are not, and the full
      // flight count is the expensive part.
      const trapped = after.isAttacked(m.to, them) && trappedOnBoard(after.fen(), me);
      after.undo();
      if (trapped && trapped.square === m.to) {
        out.push({ san: m.san, from: m.from, to: m.to, captured: m.captured, replySan: r.san, replyFrom: r.from, replyTo: r.to });
        break;
      }
    }
  }
  return out;
}

/** The warning, said to the student before they grab. */
export function queenGrabTrapLine(t: QueenGrabTrap): string {
  return `Their ${NAME[t.captured]} on ${t.to} looks free, but after ${t.san} they answer ${t.replySan} and your queen has no safe square. Before the queen grabs, count its way back out.`;
}
