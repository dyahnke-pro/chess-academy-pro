// TRADE JUDGEMENT (WO-TEACH-GAPS P3, T3 #45). He never lets a trade pass
// without saying whether it was a good deal: "trade when you're ahead", "every
// trade helps them when you're down", "that was your bad bishop — happy to give
// it", "that knight was the one eyeing your king".
//
// A TRADE here is board-true: the student captured a non-pawn piece, the reply
// took back on the SAME square, and the two pieces were worth the same. Then
// the first reason that holds, each read off the board after the trade:
//   ahead   — the student is 2+ points up: trades make the extra material count;
//   behind  — 2+ points down AND the trade cost (cpLoss >= 50): trades bring
//             the ending where their material decides;
//   bad bishop — the student gave a bishop whose own FIXED central pawns
//             (files c–f, off their home rank, 3+) sit on its colour;
//   defender — the piece they lost stood within two squares of the student's
//             king.
// Otherwise silent: an even trade with nothing to say about it is not news.
//
// A LEAF: chess.js + the structure reader.
import { boardEdgeWords } from '../utils/countWords';
import { Chess } from 'chess.js';
import { describeStructure } from './boardStructure';
import { settledLeadFor } from './material';
import { MATERIAL_VALUE } from './pieceValues';
import { strongestByDelta, weakestByDelta, type PieceValue } from './pieceValueRead';

export type TradeReason = 'their-best' | 'gave-best' | 'ahead' | 'behind' | 'bad-bishop' | 'attacker-gone';

export interface TradeJudgement {
  reason: TradeReason;
  text: string;
  squares: string[];
}

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
/** The material edge in words — the count behind "ahead" / "behind". */
const isLight = (sq: string): boolean => (sq.charCodeAt(0) - 97 + Number(sq[1])) % 2 === 0;
const dist = (a: string, b: string): number =>
  Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));

/** `values` = the engine's per-piece table (`evalBoard`) for `fenBefore`, when
 *  the caller has it — the good-piece / bad-piece read (David 2026-09-30). */
export function tradeJudgement(fenBefore: string, san: string, reply: string | null, student: 'w' | 'b', cpLoss: number, values?: readonly PieceValue[]): TradeJudgement | null {
  if (!reply) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  if (c.turn() !== student) return null;
  let mine; let theirs;
  try { mine = c.move(san); theirs = c.move(reply.replace(/^…/, '')); } catch { return null; }
  if (!mine.captured || mine.piece === 'p' || mine.piece === 'k') return null;
  if (!theirs.captured || theirs.to !== mine.to) return null;
  if (MATERIAL_VALUE[mine.captured] !== MATERIAL_VALUE[mine.piece]) return null;
  const s = describeStructure(c.fen());
  if (!s) return null;
  // The student is to move with the recapture on mine.to still to come —
  // read the lead with that exchange settled, never mid-sequence.
  const edge = settledLeadFor(c.fen(), student, { to: theirs.to, captured: theirs.captured ?? null });
  const gave = NAME[mine.piece] ?? 'piece';
  const got = NAME[mine.captured] ?? 'piece';
  // GOOD PIECE, BAD PIECE — read off the engine's table of THIS board, on the
  // same scale-free delta the "trade off their best piece" line uses. Needs
  // pieces of the traded kind on both sides to compare, so both reads must
  // name the traded squares exactly.
  if (values && values.length > 0) {
    const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
    const theirBest = strongestByDelta(values, them);
    const myWorst = weakestByDelta(values, student);
    const myBest = strongestByDelta(values, student);
    const theirWorst = weakestByDelta(values, them);
    if (theirBest?.square === mine.to && theirBest.delta > 0) {
      return { reason: 'their-best', squares: [mine.to], text: `A good trade — their ${got} on ${mine.to} was the piece doing the most work for them${myWorst?.square === mine.from ? `, and it cost you your least useful piece` : ''}.` };
    }
    if (myBest?.square === mine.from && myBest.delta > 0 && theirWorst?.square === mine.to) {
      return { reason: 'gave-best', squares: [mine.from, mine.to], text: `That trade gave up your best piece, the ${gave} on ${mine.from}, for their least useful one — keep the pieces that are working and trade the ones that are not.` };
    }
  }
  if (edge >= 2) {
    return { reason: 'ahead', squares: [mine.to], text: `A ${gave} for a ${got} — and trading is exactly right when you are ahead — and you are ${boardEdgeWords(c.fen(), student, edge)} up — every piece off the board makes your extra material count for more.` };
  }
  if (edge <= -2 && cpLoss >= 50) {
    return { reason: 'behind', squares: [mine.to], text: `Careful with trades when you are behind — you are ${boardEdgeWords(c.fen(), student === 'w' ? 'b' : 'w', -edge)} down, and each one brings the ending closer, and in the ending their extra material decides. Keep pieces on and make it complicated.` };
  }
  if (mine.piece === 'b') {
    const colourLight = isLight(mine.from);
    const home = student === 'w' ? '2' : '7';
    const ownPawns = c.board().flat().filter((p) => p && p.type === 'p' && p.color === student
      && 'cdef'.includes(p.square[0]) && p.square[1] !== home && isLight(p.square) === colourLight).length;
    if (ownPawns >= 3) {
      return { reason: 'bad-bishop', squares: [mine.to], text: `That was a good bishop to give away — ${ownPawns} of your own centre pawns stand on its ${colourLight ? 'light' : 'dark'} squares and hemmed it in, and it went for their ${got}.` };
    }
  }
  const king = c.board().flat().find((p) => p && p.type === 'k' && p.color === student)?.square;
  if (king && dist(mine.to, king) <= 2) {
    return { reason: 'attacker-gone', squares: [mine.to, king], text: `A good trade — their ${got} stood ${dist(mine.to, king) === 1 ? 'right next to' : 'close to'} your king, and now it is gone.` };
  }
  return null;
}
