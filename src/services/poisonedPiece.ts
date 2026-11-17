// poisonedPiece — THE PIECE THAT LOOKS LOOSE BUT CAN'T BE TAKEN (Danya speedrun
// PHAmfkkrSSs, 4.Be2: "Be2 eyes h5: if …fxg5, Bxh5+ Rxh5 Qxh5 is mate, so the
// g5 bishop can't be taken").
//
// The board fact: after the move a piece of the mover's can be won by the
// legal exchange (`legalSeeGainFor`), and every capture of it walks into a
// forced mate in one or two (checks only, every defence tried — chess.js
// brute force, so the mate is exact). Said on the move that makes it so: the
// piece was not poisoned before. Both seats. PURE: chess.js and the exchange.
import { openSentence } from '../utils/openSentence';
import { sideToMoveAs } from './threatOut';
import { unmarked } from '../utils/sanMark';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

export interface PoisonedPiece {
  square: Square;
  piece: PieceSymbol;
  /** The capture and the mate that answers it, in SAN. */
  capture: string;
  mate: string[];
}

/** A forced mate for the side to move on `c` within `moves` of its own moves,
 *  checks only; the line (attacker's moves and the best defence), or null. */
function checkMate(c: Chess, moves: number): string[] | null {
  for (const m of c.moves({ verbose: true })) {
    if (!m.san.includes('+') && !m.san.includes('#')) continue;
    c.move(m);
    if (c.isCheckmate()) { c.undo(); return [m.san]; }
    if (moves > 1) {
      let line: string[] | null = null;
      let ok = true;
      for (const r of c.moves({ verbose: true })) {
        c.move(r);
        const rest = checkMate(c, moves - 1);
        c.undo();
        if (!rest) { ok = false; break; }
        if (!line) line = [r.san, ...rest];
      }
      if (ok && line) { c.undo(); return [m.san, ...line]; }
    }
    c.undo();
  }
  return null;
}

/** Is the mover's piece on `sq` poisoned on `fen` (`them` to move)? */
function poisonedOn(fen: string, sq: Square, them: Color): { capture: string; mate: string[] } | null {
  if (legalSeeGainFor(fen, sq, them) < 1) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== them) return null;
  const caps = c.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (caps.length === 0) return null;
  let first: { capture: string; mate: string[] } | null = null;
  for (const m of caps) {
    c.move(m);
    const mate = checkMate(c, 2);
    c.undo();
    if (!mate) return null;
    if (!first) first = { capture: m.san, mate };
  }
  return first;
}

/** The poisoned piece the move `san` from `fenBefore` makes, or null. */
export function poisonedPiece(fenBefore: string, san: string): PoisonedPiece | null {
  let after: Chess;
  let mv;
  try {
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (after.inCheck() || after.isGameOver()) return null;
  const me = mv.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const fenAfter = after.fen();
  for (const row of after.board()) for (const cell of row) {
    if (!cell || cell.color !== me || cell.type === 'k' || cell.type === 'p') continue;
    const p = poisonedOn(fenAfter, cell.square, them);
    if (!p) continue;
    // New with this move: before it, taking the piece was not answered by mate.
    const sqBefore = cell.square === mv.to ? mv.from : cell.square;
    // The one null-move rule (`sideToMoveAs`): a side in check cannot pass.
    const asThem = sideToMoveAs(fenBefore, them);
    if (asThem && poisonedOn(asThem, sqBefore, them)) continue;
    return { square: cell.square, piece: cell.type, capture: p.capture, mate: p.mate };
  }
  return null;
}

/** Said from the mover's seat (`own`: your / their), one idea a sentence,
 *  phrasings rotated on the board. */
export function poisonedPieceLine(p: PoisonedPiece, own: 'your' | 'their', fen: string): string {
  const piece = `${own} ${NAME[p.piece]} on ${p.square}`;
  const mate = unmarked(p.mate.join(' '));
  const key = stemKeyOf(`${fen}|poisonedPiece|${p.square}`);
  return rotateStem([
    `${cap(piece)} looks loose, but it can't be taken. After ${p.capture}, ${mate} is mate.`,
    `Taking ${piece} walks into mate. If ${p.capture}, then ${mate} is mate.`,
    `${cap(piece)} is poisoned. ${p.capture} runs into ${mate}, and it's mate.`,
  ], key);
}

function cap(s: string): string {
  return openSentence(s);
}
