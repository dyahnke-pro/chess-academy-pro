// centreDuo — A CENTRAL PAWN DUO AGAINST A DEFORMED CENTRE (Danya have-check, 2026-11-19).
//
// Danya, his own game (how-to-ruin-your-pawn-structure#3): "Black has a
// noticeable space advantage, two menacing central pawns (e5 and f5), and
// White's central pawn structure is clearly deformed." `pawnCentre` names a
// d/e centre the other side cannot contest; this names the other shape he
// keeps pointing at: two side-by-side central pawns facing a centre that is
// doubled or isolated.
//
// The read, chess.js and the structure reads:
//   - a DUO: two of a side's pawns side by side on neighbouring files from c to
//     f, both on its fourth or fifth rank, at least one on the d- or e-file;
//   - a DEFORMED CENTRE: the other side's d- or e-pawns include a doubled pair
//     or an isolated pawn (`findWeakPawns`).
import { Chess, type Color, type Square } from 'chess.js';
import { findWeakPawns } from './positionReadingService';
import { andList } from '../utils/andList';

export interface CentreDuo { side: Color; duo: [Square, Square]; deformed: { square: Square; why: 'doubled' | 'isolated' }[]; text: string; squares: Square[] }

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** The side with a central pawn duo against a doubled or isolated centre, or null. */
export function centreDuo(fen: string, student: Color): CentreDuo | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  for (const side of ['w', 'b'] as Color[]) {
    let duo: [Square, Square] | null = null;
    for (const rel of [4, 5]) {
      const rank = side === 'w' ? rel : 9 - rel;
      for (const [a, b] of [['c', 'd'], ['d', 'e'], ['e', 'f']] as const) {
        const pa = c.get(`${a}${rank}` as Square); const pb = c.get(`${b}${rank}` as Square);
        if (pa?.type === 'p' && pa.color === side && pb?.type === 'p' && pb.color === side) duo = [`${a}${rank}` as Square, `${b}${rank}` as Square];
      }
    }
    if (!duo) continue;
    const w = findWeakPawns(fen, other(side));
    const central = (s: Square): boolean => s[0] === 'd' || s[0] === 'e';
    const deformed = [
      ...w.doubled.filter(central).map((square) => ({ square, why: 'doubled' as const })),
      ...w.isolated.filter(central).filter((s) => !w.doubled.includes(s)).map((square) => ({ square, why: 'isolated' as const })),
    ];
    if (!deformed.length) continue;
    const mine = side === student;
    const kinds = [...new Set(deformed.map((d) => d.why))];
    const text = `${mine ? 'Your' : 'Their'} pawns on ${duo[0]} and ${duo[1]} stand side by side in the centre, ready to advance, while ${mine ? 'their' : 'your'} central pawns are ${andList(kinds)} (${andList(deformed.map((d) => d.square))}) and cannot meet them as a pair.`;
    return { side, duo, deformed, text, squares: [...duo, ...deformed.map((d) => d.square)] };
  }
  return null;
}
