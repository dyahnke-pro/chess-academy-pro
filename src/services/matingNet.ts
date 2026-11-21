// matingNet — THE KING IS IMPRISONED (Danya, a-guide-to-underpromotion: "…and
// the king is imprisoned").
//
// `queenNet` and `queenKnightNet` read a net drawn by named pieces; nothing
// read the net itself, whatever draws it. The read, chess.js only (G0):
//   · every square next to the king is its own piece's, or covered by the other
//     side (read with the king lifted off the board, so a rook's line through
//     the king's square still counts), and
//   · the other side has a mate in one there — its own move, or handed the move
//     (the null move, `mateThreatsAgainst`: the mate it threatens).
// Each covered square is named once, under the piece that covers the most of
// them. The mate is named only when it is the opponent's; the student's own
// mate is theirs to find, so it is said as "one move away" and never named.
// Both seats.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { mateThreatsAgainst } from './threatOut';
import { PIECE_NAMES } from '../types/tacticTypes';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';

export interface NetCover { square: Square; type: PieceSymbol; covers: Square[] }

export interface MatingNet {
  /** The side that has the net drawn: the mating side. */
  side: Color;
  king: Square;
  /** Every square next to the king that is not its own piece's. */
  flights: Square[];
  /** Who covers which flight square, each square named once. */
  cover: NetCover[];
  /** The mate in one it has (SAN). */
  mate: string;
  mateFrom: Square;
  mateTo: Square;
  text: string;
  squares: Square[];
}

function around(sq: Square): Square[] {
  const f = sq.charCodeAt(0);
  const r = Number(sq[1]);
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const ff = f + df;
    const rr = r + dr;
    if (ff < 97 || ff > 104 || rr < 1 || rr > 8) continue;
    out.push(`${String.fromCharCode(ff)}${rr}` as Square);
  }
  return out;
}

/** The net round `defender`'s king, or null. */
function netAround(fen: string, defender: Color): Omit<MatingNet, 'text'> | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const attacker: Color = defender === 'w' ? 'b' : 'w';
  const king = c.findPiece({ type: 'k', color: defender })[0];
  if (!king) return null;
  const lifted = new Chess(fen);
  lifted.remove(king);
  const flights: Square[] = [];
  const byPiece = new Map<Square, Square[]>();
  for (const s of around(king)) {
    const p = c.get(s);
    if (p && p.color === defender) continue;
    flights.push(s);
    const att = lifted.attackers(s, attacker);
    if (att.length === 0) return null;
    for (const a of att) byPiece.set(a, [...(byPiece.get(a) ?? []), s]);
  }
  const mates = mateThreatsAgainst(fen, defender).moves;
  if (mates.length === 0) return null;
  // Each flight square named once: the piece that covers the most goes first.
  const cover: NetCover[] = [];
  const named = new Set<Square>();
  const order = [...byPiece.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  while (named.size < flights.length) {
    const next = order
      .map(([sq, ss]) => ({ sq, fresh: ss.filter((s) => !named.has(s)) }))
      .filter((o) => o.fresh.length > 0)
      .sort((a, b) => b.fresh.length - a.fresh.length || a.sq.localeCompare(b.sq))[0];
    if (!next) break;
    const piece = c.get(next.sq);
    if (!piece) break;
    cover.push({ square: next.sq, type: piece.type, covers: next.fresh.sort() });
    for (const s of next.fresh) named.add(s);
  }
  const m = mates[0];
  return { side: attacker, king, flights, cover, mate: m.san, mateFrom: m.from as Square, mateTo: m.to as Square, squares: [] };
}

/** The mating net on the board, either king, from the student's seat; null
 *  when neither king is in one. */
export function matingNet(fen: string, student: Color): MatingNet | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.isGameOver()) return null;
  // The side to move's king first: the net it has to answer now.
  const toMove = c.turn();
  for (const defender of [toMove, toMove === 'w' ? 'b' : 'w'] as Color[]) {
    const n = netAround(fen, defender);
    if (!n) continue;
    const mine = n.side === student;
    const kingOwn = mine ? 'their' : 'your';
    const pieceOwn = mine ? 'your' : 'their';
    // One piece a sentence.
    // Two squares at most a sentence (the voice rule): a piece covering two
    // is named without its own square, which the board lights.
    const covers = n.cover.map((p) => ` ${openSentence(pieceOwn)} ${PIECE_NAMES[p.type]}${p.covers.length > 1 && n.cover.filter((q) => q.type === p.type).length === 1 ? '' : ` on ${p.square}`} covers ${andList(p.covers)}.`).join('');
    const key = stemKeyOf(`${fen}|mating-net`);
    const lead = n.flights.length === 0
      ? `${openSentence(kingOwn)} king on ${n.king} has no square to go to: its own pieces box it in.`
      : rotateStem([
        `${openSentence(kingOwn)} king on ${n.king} has no square to go to.`,
        `${openSentence(kingOwn)} king on ${n.king} is imprisoned.`,
      ], key);
    const why = n.flights.length === 0 ? '' : covers;
    const mateSan = n.mate.replace('#', '');
    const close = mine
      ? rotateStem([
        'Mate is one move away. Look for it.',
        'One move mates it. Find it before they find a way out.',
      ], key + 1)
      : rotateStem([
        `They threaten ${mateSan}, checkmate. Make room for your king first.`,
        `They have ${mateSan} ready, and it is checkmate. Find your king a square before anything else.`,
      ], key + 1);
    const text = `${lead}${why} ${close}`;
    const squares: Square[] = [n.king, ...n.flights, ...n.cover.map((p) => p.square), ...(mine ? [] : [n.mateFrom, n.mateTo])];
    return { ...n, text, squares: [...new Set(squares)] };
  }
  return null;
}
