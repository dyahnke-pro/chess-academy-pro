// emptyCheck — A CHECK THAT GOES NOWHERE (Danya speedrun Ytkf3, beginner game:
// "…Qh4+ is simply blocked by g3; don't throw checks with your pieces
// undeveloped — blocking is a defence too").
//
// The move played gives check, it cost at least half a pawn against the best
// move (the surface's own graded cost), and the engine's answer to it is a
// quiet block or a king step — no capture of the checker, so the check simply
// ran out. Then the checking piece has to move again: a check is a tempo only
// when it wins something. PURE: chess.js.
import { openSentence } from '../utils/openSentence';
import { Chess, type PieceSymbol } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface EmptyCheck {
  san: string;
  piece: PieceSymbol;
  /** The answer: a block, or the king stepping aside. */
  reply: string;
  kind: 'block' | 'king';
  squares: string[];
}

/** Half a pawn: the check cost something against the best move. */
export const EMPTY_CHECK_COST_CP = 50;

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

/** `replyUci`: the engine's best answer after the move (its read after it). */
export function emptyCheckAt(fenBefore: string, san: string, costCp: number | null, replyUci: string | null): EmptyCheck | null {
  if (costCp === null || costCp < EMPTY_CHECK_COST_CP || !replyUci) return null;
  let c: Chess;
  let mv;
  try { c = new Chess(fenBefore); mv = c.move(san); } catch { return null; }
  if (!c.inCheck() || mv.captured) return null;
  let r;
  try { r = c.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] }); } catch { return null; }
  if (r.captured) return null;
  const kind: EmptyCheck['kind'] = r.piece === 'k' ? 'king' : 'block';
  return { san: mv.san, piece: mv.piece, reply: r.san, kind, squares: [mv.to, r.to] };
}

/** From the checking side's seat, in the human voice: lead with the piece,
 *  never the move's name (Learn says "your queen", not the move just played),
 *  three phrasings rotated on the board. */
export function emptyCheckLine(e: EmptyCheck, own: 'your' | 'their', fen: string): string {
  const who = own === 'your' ? 'they' : 'you';
  const Who = openSentence(who);
  const p = NAME[e.piece];
  const ans = e.kind === 'block' ? `block it with ${e.reply}` : `step aside with ${e.reply}`;
  const Own = openSentence(own);
  return rotateStem([
    `${Own} ${p}'s check goes nowhere: ${who} simply ${ans}. Now the ${p} has to move again. A check only helps when it wins something.`,
    `${Who} ${ans}, and that check is over. ${Own} ${p} is left to move a second time. Give check when it gains something, not because it's there.`,
    `That check by ${own} ${p} runs out at once, since ${who} ${ans}. The ${p} has spent a move and gained no time.`,
  ], stemKeyOf(`${fen}|${e.san}`));
}
