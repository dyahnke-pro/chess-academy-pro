// desperado — TWO PIECES HANGING, SELL THE ONE YOU CANNOT SAVE (Danya speedrun
// 1Rejj, beginner game: "when two pieces hang at once, first ask whether the
// lost one can be sold for something").
//
// The board before a move: two or more of the mover's pieces (not pawns) can
// be won by a legal capture, and the engine's best move is a CAPTURE made by
// one of them — the piece that is lost anyway takes something on its way out.
// Grounded twice: the hanging pieces by legal SEE, the sale by the engine's own
// best move. PURE: chess.js and the position reader.
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { findHangingBySee } from './positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { withArticle } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface Desperado {
  /** The sale: the engine's best move, a capture by a hanging piece. */
  san: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured: PieceSymbol;
  /** The other hanging piece, the one the sale leaves to be saved. */
  other: { square: Square; piece: PieceSymbol };
  /** The move played was the sale. */
  found: boolean;
}

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

/** The sale on `fenBefore` (mover to move), against the move played `san`.
 *  `bestUci`: the engine's best move there; null where the surface has none. */
export function desperadoAt(fenBefore: string, san: string, bestUci: string | null): Desperado | null {
  if (!bestUci) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const me = c.turn();
  const hanging = findHangingBySee(fenBefore).filter((h) => h.color === me && h.piece !== 'p');
  if (hanging.length < 2) return null;
  let best;
  try { best = new Chess(fenBefore).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] }); } catch { return null; }
  if (!best.captured || !hanging.some((h) => h.square === best.from)) return null;
  const other = hanging.find((h) => h.square !== best.from);
  if (!other) return null;
  let played;
  try { played = new Chess(fenBefore).move(san); } catch { return null; }
  return {
    san: best.san, from: best.from, to: best.to, piece: best.piece, captured: best.captured,
    other: { square: other.square, piece: other.piece },
    found: played.from === best.from && played.to === best.to,
  };
}

/** Said from the mover's seat (`own`: your / their), in the human voice:
 *  one idea a sentence, three phrasings rotated on the board (`rotateStem`). */
export function desperadoLine(d: Desperado, own: 'your' | 'their', fen: string): string {
  const p = NAME[d.piece];
  const took = withArticle(NAME[d.captured]);
  const o = `${NAME[d.other.piece]} on ${d.other.square}`;
  const key = stemKeyOf(`${fen}|${d.san}`);
  return d.found
    ? rotateStem([
      `Two of ${own} pieces were hanging, and only one could be saved. So the ${p} takes ${took} on its way out.`,
      `The ${p} was lost anyway, so it grabs ${took} first. When two pieces hang, sell the one you can't save.`,
      `Two pieces were hanging and only one could stay. The ${p} sells itself for ${took}.`,
    ], key)
    : rotateStem([
      `Two of ${own} pieces were hanging: the ${p} on ${d.from} and the ${o}. Only one can be saved, so sell the other first. ${d.san} takes ${took} on its way out.`,
      `The ${p} on ${d.from} and the ${o} were both hanging. One of them was going anyway. ${d.san} sells the ${p} for ${took} before it goes.`,
      `With the ${p} and the ${o} both hanging, one is lost whatever happens. Make it cost something: ${d.san} takes ${took} first.`,
    ], key);
}
