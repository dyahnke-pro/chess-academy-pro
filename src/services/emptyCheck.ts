// emptyCheck — A CHECK THAT GOES NOWHERE (Danya speedrun Ytkf3, beginner game:
// "…Qh4+ is simply blocked by g3; don't throw checks with your pieces
// undeveloped — blocking is a defence too").
//
// The move played gives check, it cost at least half a pawn against the best
// move (the surface's own graded cost), and the engine's answer to it is a
// quiet block or a king step — no capture of the checker, so the check simply
// ran out. Then the checking piece has to move again: a check is a tempo only
// when it wins something. PURE: chess.js.
import { Chess, type PieceSymbol } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';

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

/** From the checking side's seat. */
export function emptyCheckLine(e: EmptyCheck, own: 'your' | 'their'): string {
  const who = own === 'your' ? 'they' : 'you';
  const answer = e.kind === 'block' ? `${who} simply block with ${e.reply}` : `${who} step aside with ${e.reply}`;
  return `${e.san} is a check that goes nowhere: ${answer}, and ${own} ${NAME[e.piece]} has to move again. A check is worth giving only when it wins something.`;
}
