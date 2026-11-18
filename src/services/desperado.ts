// desperado — TWO PIECES HANGING, SELL THE ONE YOU CANNOT SAVE (Danya speedrun
// 1Rejj, beginner game: "when two pieces hang at once, first ask whether the
// lost one can be sold for something").
//
// The board before a move: two or more of the mover's pieces (not pawns) can
// be won by a legal capture, and the engine's best move is a CAPTURE made by
// one of them — the piece that is lost anyway takes something on its way out.
// Grounded twice: the hanging pieces by legal SEE, the sale by the engine's own
// best move.
//
// ONE PIECE LOST ANYWAY (Danya, "Desperado Defense": a piece that cannot be
// saved should take something before it goes): one piece hangs, no legal move
// of the mover leaves it safe (each is read by the legal exchange on the
// board after it), and the engine's best move is a capture by that piece
// that still leaves it to be taken. PURE: chess.js and the position reader.
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { findHangingBySee, legalSeeGainFor } from './positionReadingService';
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
  /** The other hanging piece, the one the sale leaves to be saved — or null:
   *  the one piece hanging is lost whatever the mover does. */
  other: { square: Square; piece: PieceSymbol } | null;
  /** The piece that takes is safe after it: the other hanging piece goes. */
  survives: boolean;
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
  if (hanging.length === 0) return null;
  let best;
  try { best = new Chess(fenBefore).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] }); } catch { return null; }
  if (!best.captured || !hanging.some((h) => h.square === best.from)) return null;
  // A SALE, not a grab: the piece takes something worth no more than itself
  // (taking more — the queen that hit it — is winning material: article
  // boards 2026-11-18, "the bishop takes a queen on its way out"). It either
  // is still taken after it, or it survives and the OTHER hanging piece is
  // the one that goes — said so, never "on its way out". Taking the piece
  // that attacked it, of the same value, and being taken back is a plain
  // trade ("the queen sells itself for a queen"), not a sale.
  if ((MATERIAL_VALUE[best.captured] ?? 0) > (MATERIAL_VALUE[best.piece] ?? 0)) return null;
  const them = me === 'w' ? 'b' : 'w';
  const after = new Chess(fenBefore);
  after.move(best);
  const survives = legalSeeGainFor(after.fen(), best.to, them) <= 0;
  const tookAttacker = c.attackers(best.from, them).includes(best.to);
  if (!survives && tookAttacker && (MATERIAL_VALUE[best.captured] ?? 0) === (MATERIAL_VALUE[best.piece] ?? 0)) return null;
  const other = hanging.find((h) => h.square !== best.from) ?? null;
  if (!other && (survives || !lostAnyway(fenBefore, best.from))) return null;
  // "The other is the one that goes" only while it still hangs after the take.
  if (other && survives && legalSeeGainFor(after.fen(), other.square, them) <= 0) return null;
  let played;
  try { played = new Chess(fenBefore).move(san); } catch { return null; }
  return {
    san: best.san, from: best.from, to: best.to, piece: best.piece, captured: best.captured,
    other: other ? { square: other.square, piece: other.piece } : null,
    survives,
    found: played.from === best.from && played.to === best.to,
  };
}

/** The piece on `sq` cannot be saved: after every legal move of the mover
 *  (bar a capture it makes itself) it is still won by the legal exchange,
 *  wherever it stands. */
function lostAnyway(fen: string, sq: Square): boolean {
  const c = new Chess(fen);
  const me = c.turn();
  const them = me === 'w' ? 'b' : 'w';
  const piece = c.get(sq);
  if (!piece) return false;
  for (const m of c.moves({ verbose: true })) {
    if (m.from === sq && m.captured) continue;
    const a = new Chess(fen);
    a.move(m);
    if (a.isCheckmate()) return false;
    const at = m.from === sq ? m.to : sq;
    if (a.get(at)?.type !== piece.type) return false;
    if (legalSeeGainFor(a.fen(), at, them) <= 0) return false;
  }
  return true;
}

/** Said from the mover's seat (`own`: your / their), in the human voice:
 *  one idea a sentence, three phrasings rotated on the board (`rotateStem`). */
export function desperadoLine(d: Desperado, own: 'your' | 'their', fen: string): string {
  const p = NAME[d.piece];
  const took = withArticle(NAME[d.captured]);
  const key = stemKeyOf(`${fen}|${d.san}`);
  if (!d.other) {
    const Own = own === 'your' ? 'Your' : 'Their';
    return d.found
      ? rotateStem([
        `${Own} ${p} was lost anyway, since no move could save it. So it takes ${took} on its way out.`,
        `Nothing could save the ${p}, so it grabs ${took} first. A piece that is lost anyway should cost them something.`,
      ], key)
      : rotateStem([
        `${Own} ${p} on ${d.from} was lost anyway, since no move could save it. ${d.san} makes it cost something: it takes ${took} first.`,
        `Nothing could save the ${p} on ${d.from}. Before it goes, ${d.san} takes ${took}.`,
      ], key);
  }
  const o = `${NAME[d.other.piece]} on ${d.other.square}`;
  if (d.survives) {
    return d.found
      ? rotateStem([
        `Two of ${own} pieces were hanging, and only one could be saved. So the ${p} takes ${took} first, and the ${NAME[d.other.piece]} is the one that goes.`,
        `Two pieces were hanging. The ${p} grabs ${took} first, so losing the ${NAME[d.other.piece]} costs nothing extra.`,
      ], key)
      : rotateStem([
        `Two of ${own} pieces were hanging: the ${p} on ${d.from} and the ${o}. Only one can be saved, so take something first. ${d.san} takes ${took}, and the ${NAME[d.other.piece]} is the one that goes.`,
        `The ${p} on ${d.from} and the ${o} were both hanging. ${d.san} takes ${took} first, so the piece you lose is paid for.`,
      ], key);
  }
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
