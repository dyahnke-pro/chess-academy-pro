// tradeWords — the shared words of the trade computers (`tradeOffer`,
// `fileTrade`, `pawnEndingTrade`, `tradeKept`): the seat a line is said from,
// the lead said as the thing it is, the engine's score from a seat. PURE.
import { Chess, type Color, type PieceSymbol } from 'chess.js';
import { materialBalance } from './pieceValues';
import { quietBalance } from './material';
import type { AnalysisLine } from '../types';
import { MATE_EVAL_VALUE } from './engineConstants';

/** The seat a line is said from: the mover is the student ("you") or not. */
export interface TradeSeat {
  /** "you" / "they" */
  sub: string;
  /** "your" / "their" */
  own: string;
  /** The other side's: "their" / "your" */
  opp: string;
  /** "you're" / "they're" */
  are: string;
}

export function tradeSeat(moverIsStudent: boolean): TradeSeat {
  return moverIsStudent
    ? { sub: 'you', own: 'your', opp: 'their', are: "you're" }
    : { sub: 'they', own: 'their', opp: 'your', are: "they're" };
}

export const PIECE_WORD: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** The material lead of `side` on `fen`, in pawns, with any capture the side
 *  to move has on offer counted (the smaller of the raw count and the quiet
 *  one), so a piece about to be taken back is not counted as a lead. */
export function leadOf(fen: string, side: Color): number {
  const raw = materialBalance(fen) * (side === 'w' ? 1 : -1);
  const quiet = quietBalance(fen) * (side === 'w' ? 1 : -1);
  return Math.min(raw, quiet);
}

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** What `side` is up on `fen`, said as the thing it is: "a rook", "a piece",
 *  "two pawns". Null when it is not ahead by the pieces on the board. */
export function leadWord(fen: string, side: Color): string | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const count = (color: Color, t: PieceSymbol): number => c.board().flat().filter((x) => x && x.color === color && x.type === t).length;
  const d = (t: PieceSymbol): number => count(side, t) - count(other(side), t);
  if (d('q') !== 0) return null;
  if (d('r') >= 1 && d('n') + d('b') >= 0) return 'a rook';
  if (d('r') !== 0) return null;
  if (d('n') + d('b') >= 1) return 'a piece';
  if (d('n') + d('b') !== 0) return null;
  const p = d('p');
  if (p < 1) return null;
  return p === 1 ? 'a pawn' : `${COUNT[p] ?? p} pawns`;
}

/** A line's score for `side`, in centipawns (a mate is the mate value). */
export function scoreFor(l: AnalysisLine, side: Color): number {
  const cp = l.mate !== null ? (l.mate > 0 ? MATE_EVAL_VALUE : -MATE_EVAL_VALUE) : l.evaluation;
  return side === 'w' ? cp : -cp;
}

/** The move as uci. */
export function uciOf(m: { from: string; to: string; promotion?: string }): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}
