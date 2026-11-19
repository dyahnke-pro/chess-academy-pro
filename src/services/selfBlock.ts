// selfBlock — YOUR OWN PIECE IN YOUR KING'S WAY (Danya have-check, 2026-11-19).
//
// Danya (the-importance-of-solving-studies#2): "moving the bishop somewhere
// along the a1-h8 diagonal will block the king's path, giving Black a crucial
// tempo … 1.Bh8!!: h8 is the only square on the long diagonal that does not
// stand in the king's way!" The king race counts both kings' walks; nothing
// read that the side's own next move can lengthen its own king's walk.
//
// The read, chess.js and the engine's best line (G0): in a king race
// (`kingRace`) whose racing king belongs to the side to move, the best line's
// first move is a bishop, knight or rook move that leaves that king's walk to
// the escort square no longer than it was, while two or more other moves of
// the same piece would stand on the walk and make it longer than the best's. The square the
// engine picks is named; the blocking squares are counted, not listed. Both
// seats.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { type EngineLine, PIECE_NAME, playLine, sortedLines } from './engineLineRead';
import { kingRace, kingSteps } from './kingRace';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { countWord } from '../utils/andList';

export interface SelfBlock { side: Color; piece: Square; best: string; blocking: number; escort: Square; text: string; squares: Square[] }

/** The king's walk after `m`, a piece standing on the escort square counted as a block. */
function walkAfter(fen: string, m: Move, king: Square, escort: Square, side: Color): number | null {
  const c = new Chess(fen); c.move(m);
  if (c.get(escort)?.color === side) return null;
  return kingSteps(c, king, escort, side);
}

export function selfBlock(fen: string, lines: readonly EngineLine[], student: Color): SelfBlock | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const race = kingRace(fen, student);
  if (!race || race.side !== side) return null;
  const king = c.findPiece({ type: 'k', color: side })[0];
  if (!king) return null;
  const now = kingSteps(c, king, race.escort, side);
  if (now === null) return null;
  const ls = sortedLines(lines, side);
  if (!ls.length) return null;
  const best = playLine(fen, ls[0].moves, 1).moves[0];
  if (!best || !'nbr'.includes(best.piece)) return null;
  const clear = walkAfter(fen, best, king, race.escort, side);
  if (clear === null || clear > now) return null;
  const others = c.moves({ square: best.from, verbose: true }).filter((m) => m.to !== best.to);
  const blocking = others.filter((m) => { const w = walkAfter(fen, m, king, race.escort, side); return w === null || w > clear; }).length;
  if (blocking < 2) return null;
  const you = side === student;
  const name = PIECE_NAME[best.piece];
  const key = stemKeyOf(`${fen}|self-block`);
  const count = countWord(blocking);
  const text = you
    ? rotateStem([
      `Careful where the ${name} goes: ${count} of its squares stand in your king's way to ${race.escort}, and in a race one step is everything. ${best.san} is the square that keeps the road clear.`,
      `Your king needs a clear road to ${race.escort}, and the ${name} on ${best.from} can block it: ${count} of its moves cost the king a step. ${best.san} gets it out of the way.`,
    ], key)
    : rotateStem([
      `Their ${name} on ${best.from} has to move without blocking their king's road to ${race.escort}: ${count} of its squares would cost a step, and ${best.san} is the one that doesn't.`,
      `Watch their ${name}: most of its squares stand in their own king's way to ${race.escort}. ${best.san} keeps the road open, and in a race one step can decide it.`,
    ], key);
  return { side, piece: best.from, best: best.san, blocking, escort: race.escort, text, squares: [best.from, best.to, race.escort] };
}
