// pieceRoute — THE PIECE'S TRIP (lesson voice, WO-THINK-01 P4: the Italian's
// Nbd2 — the written note teaches "the queen-knight heads for the kingside by
// the long road: d2, then f1, then on to g3 or e3"; the computed line said "it
// develops to d2, joining the game").
//
// Read off the line that follows the move (the taught line in a lesson, the
// game's own moves in Review): the same piece moves on again, by its own
// choice, to a new square. A move made because the piece was attacked is a
// retreat, not a trip, and ends it; so does the piece being taken. The trip is
// said from where it stands now: "sending the knight on to e3, by way of f1".
//
// Pure chess.js. Learn plays a live game with no line ahead, so it has no trip
// to read.
import { Chess, type Move, type Square } from 'chess.js';
import { routeVia, routeWaypoints } from '../utils/routeWords';
import { findWorstPlacedPiece, worstReason } from './nextPlans';
import { pieceScope } from './positionReadingService';

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A trip goes on within the mover's next two moves (the Italian's Nbd2, Bb5,
 *  Nf1, Be3, Nxe3): a piece that waits three has stopped. */
const MAX_WAIT = 2;

export interface PieceRoute {
  /** "sending the knight on to e3, by way of f1" */
  text: string;
  /** The same trip led by a verb: "sends the knight on to e3, by way of f1". */
  verb: string;
  /** Where the piece stands now, then each square it goes on to. */
  path: string[];
  /** The piece was the mover's worst-placed piece (`findWorstPlacedPiece`)
   *  and the trip ends where it covers more squares: what was wrong with it,
   *  and how many squares it covers before and after. Null otherwise. */
  worst: { reason: string; scopeBefore: number; scopeAfter: number } | null;
}

export function pieceRoute(fenBefore: string, san: string, line: readonly string[] | null): PieceRoute | null {
  if (!line || line.length < 2) return null;
  const board = new Chess(fenBefore);
  let first: Move;
  try { first = board.move(san); } catch { return null; }
  // Castling is the king's shelter, not a trip.
  if (!PIECE[first.piece] || first.captured || first.isKingsideCastle() || first.isQueensideCastle()) return null;
  const path: string[] = [first.to];
  let at: string = first.to;
  /** The mover's moves since the piece last moved: a trip keeps going, a piece
   *  that waits longer has finished its trip (the Vienna's Nc3 … Ne2 ten moves
   *  on is a new plan, not one trip). */
  let waited = 0;
  /** The board when the piece reached its last square. */
  let endFen = board.fen();
  for (let i = 0; i + 1 < line.length; i += 2) {
    let reply: Move;
    try { reply = board.move(line[i]); } catch { break; }
    if (reply.to === at) break; // taken
    // Chased: a piece that moves on because it is attacked is retreating.
    const chased = board.attackers(at as Square, reply.color).length > 0;
    let next: Move;
    try { next = board.move(line[i + 1]); } catch { break; }
    if (next.from !== at) {
      waited += 1;
      if (waited >= MAX_WAIT) break;
      continue;
    }
    if (chased) break;
    // A capture ends the trip on the square it takes back on (the Italian's
    // Nxe3 lands the knight on e3); any other capture is a trade, not a trip.
    if (next.captured && reply.to !== next.to) break;
    if (path.includes(next.to)) break;
    path.push(next.to);
    endFen = board.fen();
    at = next.to;
    waited = 0;
    if (next.captured) break;
  }
  // A trip has a stop on the way: one more move is just the piece's next
  // move, which the deep fact says when it hits something.
  if (path.length < 3) return null;
  const dest = path[path.length - 1];
  const worst = worstAtStart(fenBefore, first.from, dest, new Chess(endFen));
  const via = routeVia(routeWaypoints(path));
  // THE WORST PIECE, RESCUED (WO-DANYA-READS-01 #3, his "have I improved all
  // of my pieces?"): the trip of the piece that was doing least is said as
  // the rescue it is, with what was wrong and what it covers at the end.
  if (worst) {
    const gain = `where it covers ${worst.scopeAfter} squares instead of ${worst.scopeBefore}`;
    return {
      text: `rescuing the worst-placed ${PIECE[first.piece]}, which ${worst.reason}: it goes on to ${dest}${via}, ${gain}`,
      verb: `rescues the worst-placed ${PIECE[first.piece]}, which ${worst.reason}: it goes on to ${dest}${via}, ${gain}`,
      path, worst,
    };
  }
  return {
    text: `sending the ${PIECE[first.piece]} on to ${dest}${via}`,
    verb: `sends the ${PIECE[first.piece]} on to ${dest}${via}`,
    path, worst: null,
  };
}

/** The moved piece was its side's worst-placed piece on the board before the
 *  move, and on the board where the trip ends it covers more squares than it
 *  did. `end`: the board after the trip's last move. */
function worstAtStart(fenBefore: string, from: Square, dest: string, end: Chess): PieceRoute['worst'] {
  let before: Chess;
  try { before = new Chess(fenBefore); } catch { return null; }
  const w = findWorstPlacedPiece(before, before.turn());
  if (!w || w.sq !== from) return null;
  const scopeBefore = pieceScope(before, from);
  const scopeAfter = pieceScope(end, dest as Square);
  if (scopeAfter <= scopeBefore) return null;
  return { reason: worstReason(w), scopeBefore, scopeAfter };
}
