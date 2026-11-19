// tradeRelievesCramp — THE CRAMPED SIDE TRADES (Danya have-check, 2026-11-19).
//
// Danya (positional-combinations#0): "To nip White's initiative in the bud,
// Black clearly needs to eliminate the f5 knight and, if possible, trade
// another pair of pieces to lessen the effect of White's space advantage";
// (mastering-intuition-part-1#0) "with a cramped opponent avoid
// simplifications". The space read says who has more room; the trade reads
// say whether a trade is even; nothing joined the two — the side short of room
// wants pieces off, the side with room wants them kept.
//
// The read, chess.js, the one territory count and the engine's top lines (G0):
// in a middlegame (a queen on, four pieces a side), one side is short of room:
// the other owns more space (`ownsMoreSpace`, the one rule), or — Danya's own
// board, where the pawns are level — a knight or bishop of the other side's
// stands in the short side's half, on its third or fourth rank, while its pieces have 85% of
// the other's safe squares or fewer; in a line within
// half a pawn of the best, one of the cramped side's first three moves takes a
// knight, bishop or rook of the other side's with a piece worth as much, and is
// taken back at once — an even trade (in the second read, of that planted
// piece). Said to the side to move when it is the
// cramped one (take it) and when it has the room (don't let it happen cheaply).
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, PIECE_NAME, lineScore, other, playLine, sortedLines } from './engineLineRead';
import { ownsMoreSpace } from './positionReadingService';
import { relativeRank } from './outpost';
import { sideToMoveAs } from './threatOut';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface TradeRelievesCramp { cramped: Color; trade: string; target: Square; text: string; squares: Square[] }

/** A side's crampedness, in percent: its pieces' safe squares this share of the other's or fewer. */
const CRAMP_PERCENT = 85;

/** The knight, bishop, rook and queen moves of `col` to squares no enemy pawn hits. */
function safeMoves(fen: string, col: Color): number {
  const f = sideToMoveAs(fen, col);
  if (!f) return 0;
  const c = new Chess(f); const enemy = other(col);
  return c.moves({ verbose: true }).filter((m) => 'nbrq'.includes(m.piece) && !c.attackers(m.to, enemy).some((a) => c.get(a)?.type === 'p')).length;
}

export function tradeRelievesCramp(fen: string, lines: readonly EngineLine[], student: Color): TradeRelievesCramp | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const toMove = c.turn();
  // A middlegame (a queen on, four pieces a side): in an ending the room that matters is the kings'.
  const army = (col: Color): number => c.board().flat().filter((p) => p && p.color === col && 'nbrq'.includes(p.type)).length;
  if (!c.findPiece({ type: 'q', color: 'w' }).length && !c.findPiece({ type: 'q', color: 'b' }).length) return null;
  if (army('w') < 4 || army('b') < 4) return null;
  // Danya's two reads of "less room": the pawns' territory (the one space rule),
  // or — with the pawns level — a piece of theirs planted in your half while
  // your pieces have clearly fewer squares (his "eliminate the f5 knight").
  const byPawns: Color | null = ownsMoreSpace(fen, other(toMove)) ? toMove : ownsMoreSpace(fen, toMove) ? other(toMove) : null;
  let cramped: Color | null = byPawns;
  let intruders: Square[] = [];
  if (!cramped) {
    const mw = safeMoves(fen, 'w'); const mb = safeMoves(fen, 'b');
    const short: Color | null = mw > 0 && mb > 0 ? (mw * 100 <= mb * CRAMP_PERCENT ? 'w' : mb * 100 <= mw * CRAMP_PERCENT ? 'b' : null) : null;
    if (!short) return null;
    intruders = c.board().flat().flatMap((p) => (p && p.color !== short && 'nb'.includes(p.type) && relativeRank(p.square, short) >= 3 && relativeRank(p.square, short) <= 4 ? [p.square] : []));
    if (!intruders.length) return null;
    cramped = short;
  }
  const mobility = byPawns ? null : { mine: safeMoves(fen, cramped), theirs: safeMoves(fen, other(cramped)) };
  const ls = sortedLines(lines, toMove);
  if (!ls.length) return null;
  const top = lineScore(ls[0], toMove);
  for (const l of ls) {
    if (top - lineScore(l, toMove) > 50) continue;
    const { moves } = playLine(fen, l.moves, 7);
    let seen = 0;
    for (let i = 0; i + 1 < moves.length; i++) {
      const m = moves[i];
      if (m.color !== cramped) continue;
      if (++seen > 3) break;
      if (!m.captured || !'nbr'.includes(m.captured) || m.piece === 'k') continue;
      const back = moves[i + 1];
      if (back.to !== m.to || !back.captured) continue;
      const v = (t: string): number => (t === 'b' ? MATERIAL_VALUE.n : MATERIAL_VALUE[t]);
      if (v(m.piece) !== v(m.captured)) continue;
      if (!byPawns && !intruders.includes(m.to)) continue;
      const you = cramped === student;
      const key = stemKeyOf(`${fen}|cramp-trade`);
      const theirPiece = `${you ? 'their' : 'your'} ${PIECE_NAME[m.captured]} on ${m.to}`;
      const text = mobility
        ? (you
          ? `${theirPiece[0].toUpperCase()}${theirPiece.slice(1)} sits in your half, and your pieces have fewer squares than theirs, ${mobility.mine} against ${mobility.theirs}. Trade it off with ${m.san}: every trade eases the cramp.`
          : `${theirPiece[0].toUpperCase()}${theirPiece.slice(1)} is the piece cramping them, and their pieces have fewer squares than yours, ${mobility.mine} against ${mobility.theirs}. Expect ${m.san} to trade it off.`)
        : you
        ? rotateStem([
          `You have less room to work with, so trades help you. ${m.san} takes off ${theirPiece}, and every pair that comes off leaves your pieces more space.`,
          `Short of space, look to trade: ${m.san} removes ${theirPiece}. The fewer pieces on the board, the less their space matters.`,
        ], key)
        : rotateStem([
          `They are short of room, so they want trades: ${m.san} would take off ${theirPiece}. Every trade eases their cramp, so don't hand them one for free.`,
          `With less space, they'll look to trade, and ${m.san} gets rid of ${theirPiece}. Keep pieces on and they stay cramped.`,
        ], key);
      return { cramped, trade: m.san, target: m.to, text, squares: [m.from, m.to] };
    }
  }
  return null;
}
