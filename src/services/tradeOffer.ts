// tradeOffer — A QUIET MOVE THAT OFFERS AN EVEN TRADE WHILE AHEAD (Danya
// speedruns: S-ZY 22.Qb5 "offers the queen trade" two pawns up; _4xb 21…Qe6
// "two pawns up, a queen trade favours you"; Ytkf 6.Qf3 "offering a queen
// trade").
//
// The board after the move: the moved queen, bishop or knight and an enemy
// piece of the same value attack each other, and the enemy can take it only
// for an even swap (signed legal SEE 0, a retake on the square). Said only when
// the mover is ahead on material that is not about to be taken back, the move
// is sound (the engine's cost) and the engine still has the mover ahead. Rooks
// on a file are `fileTrade`'s; a capture is a trade MADE, which `readTrade`
// and `queenTradeRead` judge. PURE: chess.js and the position reader.
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { signedLegalSeeFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { leadOf, leadWord, other, PIECE_WORD, tradeSeat } from './tradeWords';

/** The move cost less than this for its mover: a sound offer. */
const SOUND_CP = 50;
/** The engine still has the mover at least this far ahead after it. */
const AHEAD_CP = 100;

export interface TradeOffer {
  piece: PieceSymbol;
  square: Square;
  /** The enemy piece it faces. */
  facing: { piece: PieceSymbol; square: Square };
  /** What the mover is up, in words ("two pawns"). */
  up: string;
}

const minor = (t: PieceSymbol): boolean => t === 'n' || t === 'b';
const sameClass = (a: PieceSymbol, b: PieceSymbol): boolean => a === b || (minor(a) && minor(b));

/** The offer `san` makes on `fenBefore`. `costCp`: the engine's cost of the
 *  move for its mover; `afterCp`: the engine's score after it, from the
 *  mover's seat. Null when either is unknown — the offer is sound or it is
 *  not said. */
export function tradeOfferAt(fenBefore: string, san: string, costCp: number | null, afterCp: number | null, moverIsStudent: boolean): TradeOffer | null {
  if (costCp === null || afterCp === null || costCp >= SOUND_CP || afterCp < AHEAD_CP) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (mv.captured || !(mv.piece === 'q' || minor(mv.piece))) return null;
  const me = mv.color;
  const them = other(me);
  const fenAfter = c.fen();
  const lead = leadOf(fenAfter, me);
  if (lead < 1) return null;
  // The student's queen offer a piece or more up is `queenTradeRead`'s ("the
  // safe road"): one claim, one computer.
  if (mv.piece === 'q' && lead >= 3 && moverIsStudent) return null;
  const up = leadWord(fenAfter, me);
  if (!up) return null;
  // They can take it, and taking is an even swap: a retake on the square.
  const takers = c.moves({ verbose: true }).filter((m) => m.to === mv.to && m.captured && sameClass(m.piece, mv.piece));
  if (takers.length === 0) return null;
  if (signedLegalSeeFor(fenAfter, mv.to, them) !== 0) return null;
  if (!c.isAttacked(mv.to, me)) return null;
  // It faces that piece: the moved piece attacks it back.
  for (const t of takers) {
    const back = c.attackers(t.from, me);
    if (!back.includes(mv.to)) continue;
    if (MATERIAL_VALUE[t.piece] !== MATERIAL_VALUE[mv.piece]) continue;
    return { piece: mv.piece, square: mv.to, facing: { piece: t.piece, square: t.from }, up };
  }
  return null;
}

/** Said from the mover's seat, one idea a sentence, rotated on the board. */
export function tradeOfferLine(o: TradeOffer, moverIsStudent: boolean, fen: string): string {
  const s = tradeSeat(moverIsStudent);
  const p = PIECE_WORD[o.piece];
  const f = `${s.opp} ${PIECE_WORD[o.facing.piece]} on ${o.facing.square}`;
  const What = o.piece === 'q' ? 'the queen trade' : 'a trade';
  const Up = o.up.charAt(0).toUpperCase() + o.up.slice(1);
  return rotateStem([
    `The ${p} on ${o.square} offers ${What} with ${f}. ${Up} up, every trade brings ${s.own} won ending closer.`,
    `${s.own.charAt(0).toUpperCase() + s.own.slice(1)} ${p} on ${o.square} stands face to face with ${f}. ${s.are.charAt(0).toUpperCase() + s.are.slice(1)} ${o.up} up, so a trade suits ${s.sub === 'you' ? 'you' : 'them'}.`,
    `The ${p} on ${o.square} invites ${What}. With ${o.up} more, the fewer pieces left, the easier the win.`,
  ], stemKeyOf(`${fen}|offer|${o.square}`));
}
