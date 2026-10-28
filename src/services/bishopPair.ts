// bishopPair — THE BISHOP PAIR CHANGING HANDS, read off the board. A leaf
// (chess.js only) so the Learn point ("now you have the two bishops") and the
// review's take-back ("…and winning the bishop pair") ask the same test.
import { Chess } from 'chess.js';

/** The board test behind "now you have the two bishops": this move took
 *  their second-to-last bishop and the mover keeps both of theirs. Exported
 *  so the standing bishop-pair read can stand aside on the move the pair was
 *  WON — one fact, one owner on that turn (re-walk 1380, 19.Rxf3: "You hold
 *  the bishop pair — keep it open" beside "Now you have the two bishops — open
 *  the position"). */
export function gainedBishopPair(fenBefore: string, san: string): boolean {
  let before: Chess;
  let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return false; }
  let mv;
  try { mv = after.move(san); } catch { return false; }
  if (!mv || mv.captured !== 'b') return false;
  const bishops = (c: Chess, color: 'w' | 'b'): number =>
    c.board().flat().filter((x) => x && x.type === 'b' && x.color === color).length;
  const them = mv.color === 'w' ? 'b' : 'w';
  // A bishop that takes a bishop and can be taken back is half a trade: the
  // pair is decided on the recapture, never here (review census, Bxe3 before
  // Nxe3 was "trading bishops and winning the bishop pair").
  if (mv.piece === 'b' && after.isAttacked(mv.to, them)) return false;
  return bishops(before, them) === 2 && bishops(after, them) === 1 && bishops(after, mv.color) === 2;
}
