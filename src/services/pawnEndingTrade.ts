// pawnEndingTrade — TRADE THE LAST PIECES INTO A WON PAWN ENDING (Danya
// speedruns: S-ZY 36.Nxc7 "trade knights: the pawn ending two pawns up wins
// straightforwardly"; kYbh 25…Rxe3 "trade everything into a pawn-up pawn
// ending, which is simply winning").
//
// The move is a capture, and the engine's line after it goes on trading —
// every move a capture — until only kings and pawns are left, within four
// plies. Said when the mover is pawns up in that ending and the engine still
// has them winning it, and the move cost little. Grounded twice: the ending by
// the line's own moves played on the board, the win by the engine's score.
// PURE: chess.js.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { leadOf, leadWord, PIECE_WORD, scoreFor, tradeSeat } from './tradeWords';

/** The engine has the mover winning by at least this. */
const WINNING_CP = 300;
/** A move that cost less than this still wins the same way. */
const SOUND_CP = 100;
/** How far the trades may run in the engine's line. */
const TRADE_PLIES = 4;

export interface PawnEndingTrade {
  /** What the mover is up in the pawn ending ("two pawns"). */
  up: string;
  /** The pieces that came off on the way, in order (the move's capture first). */
  traded: string[];
  /** The squares the trades happened on. */
  squares: string[];
  /** The moves of the trade, from the board before the move (SAN). */
  sans: string[];
}

const onlyPawns = (c: Chess): boolean => c.board().flat().every((x) => !x || x.type === 'p' || x.type === 'k');

/** The trade into a pawn ending `san` starts on `fenBefore`. `after`: the
 *  engine's best line after the move (the opponent to move), or null. */
export function pawnEndingTradeAt(fenBefore: string, san: string, after: AnalysisLine | null, costCp: number | null): PawnEndingTrade | null {
  if (!after || costCp === null || costCp >= SOUND_CP) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  if (onlyPawns(c)) return null;
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (!mv.captured || mv.captured === 'p') return null;
  const me = mv.color;
  if (scoreFor(after, me) < WINNING_CP) return null;
  const traded = [PIECE_WORD[mv.captured]];
  const squares: string[] = [mv.to];
  const sans: string[] = [mv.san];
  for (let k = 0; k < TRADE_PLIES && !onlyPawns(c); k += 1) {
    const u = after.moves[k];
    if (!u) return null;
    let m;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    if (!m.captured) return null;
    traded.push(PIECE_WORD[m.captured]);
    squares.push(m.to);
    sans.push(m.san);
  }
  if (!onlyPawns(c)) return null;
  const fenEnd = c.fen();
  if (leadOf(fenEnd, me) < 1) return null;
  const up = leadWord(fenEnd, me);
  if (!up) return null;
  return { up, traded, squares: [...new Set(squares)], sans };
}

/** Said from the mover's seat, one idea a sentence, rotated on the board. */
export function pawnEndingTradeLine(t: PawnEndingTrade, moverIsStudent: boolean, fen: string): string {
  const s = tradeSeat(moverIsStudent);
  const pieces = t.traded.filter((p) => p !== 'pawn');
  // One pair came off: name it ("the knights"); more: the last pieces.
  const extra = t.up === 'a pawn' ? 'the extra pawn wins it' : 'the extra pawns win it';
  const pair = pieces.length === 2 && pieces[0] === pieces[1] ? `the ${pieces[0]}s` : 'the last pieces';
  return rotateStem([
    `Trading ${pair} leaves a king-and-pawn ending ${t.up} up. With no pieces left to stop ${t.up === 'a pawn' ? 'it' : 'them'}, ${extra}.`,
    `${pair.charAt(0).toUpperCase() + pair.slice(1)} come off, and it's a pawn ending with ${s.own} ${t.up === 'a pawn' ? 'extra pawn' : 'extra pawns'}. That ending wins, so ${s.sub} trade into it.`,
    `Off go ${pair}, into a pawn ending ${t.up} up. There's nothing left to defend against the extra ${t.up === 'a pawn' ? 'pawn' : 'pawns'}, and it wins.`,
  ], stemKeyOf(`${fen}|pawn-ending|${t.squares.join('')}`));
}
