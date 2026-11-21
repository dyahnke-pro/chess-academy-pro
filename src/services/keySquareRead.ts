// keySquareRead — THE KEY SQUARES OF A PASSED PAWN, AND WHOSE KING HAS THEM
// (Danya: "Kc5 takes the opposition and the king reaches the key square").
//
// THE GEOMETRY (the lesson matcher `endgameTechnique.detectKeySquares` keeps
// its own K+P v K copy, which also names a 7th-rank pawn's):
// a passed pawn on its 2nd–4th rank has three key squares two ranks ahead (on
// its file and the two beside it); from its 5th rank on, also the three one
// rank ahead. A rook pawn's are the two squares on the next file touching the
// promotion corner (b7 and b8 for White's a-pawn). A pawn on its 7th is left to
// the race reads: its key squares would stand in its own way.
//
// WHAT THE BOARD SAYS, kings and pawns only:
//   holds      — the owner's king stands on a key square, the pawn safe from
//                the other king's next move.
//   opposition — the owner holds the opposition (`oppositionRead`), the other
//                side has no spare pawn move, and after every king step of
//                theirs the owner's king gets a key square.
//   steps      — the owner is to move and its king has a legal step onto one.
// The verdict "it queens whoever is to move" is the K+P v K theorem, said only
// on that board, with the pawn guarded or out of the other king's reach.
//
// PURE: chess.js.
import { Chess, type Color, type Square } from 'chess.js';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { andList, orList } from '../utils/andList';
import { readOpposition } from './oppositionRead';

export type KeySquareKind = 'holds' | 'opposition' | 'steps';

export interface KeySquareRead {
  kind: KeySquareKind;
  /** The pawn's owner. */
  side: Color;
  pawn: Square;
  /** Every key square of the pawn. */
  keys: Square[];
  /** The owner's king. */
  king: Square;
  /** The key squares the king stands on (`holds`) or gets (`opposition`, `steps`). */
  to: Square[];
  /** K+P v K and the theorem applies: the pawn queens whoever is to move. */
  queens: boolean;
  /** `opposition`: the other side has pawns, none of which can move. */
  noSpare: boolean;
  key: string;
}

const fileOf = (s: string): number => s.charCodeAt(0) - 97;
const rankOf = (s: string): number => Number(s[1]);
const sq = (f: number, r: number): Square => `${String.fromCharCode(97 + f)}${r}` as Square;
const cheb = (a: string, b: string): number => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
const otherSide = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** THE KEY SQUARES of a pawn of `color` on `square` (the one geometry). A pawn
 *  on its 7th rank or beyond has none here. */
export function pawnKeySquares(square: string, color: Color): Square[] {
  const f = fileOf(square); const r = rankOf(square);
  const d = color === 'w' ? 1 : -1;
  const home = color === 'w' ? r : 9 - r;
  if (home < 2 || home >= 7) return [];
  if (f === 0 || f === 7) {
    const nf = f === 0 ? 1 : 6;
    const promo = color === 'w' ? 8 : 1;
    return [sq(nf, promo - d), sq(nf, promo)];
  }
  const ranks = home >= 5 ? [r + d, r + 2 * d] : [r + 2 * d];
  const out: Square[] = [];
  for (const rr of ranks) for (const ff of [f - 1, f, f + 1]) out.push(sq(ff, rr));
  return out;
}

interface Man { type: string; color: Color; square: Square }

function men(c: Chess): Man[] {
  return c.board().flat().filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ type: x.type, color: x.color, square: x.square }));
}

/** A pawn with no enemy pawn ahead of it on its own or a next file. */
export function isPassedPawn(all: readonly Man[], p: Man): boolean {
  const d = p.color === 'w' ? 1 : -1;
  return !all.some((o) => o.type === 'p' && o.color !== p.color && Math.abs(fileOf(o.square) - fileOf(p.square)) <= 1
    && (d === 1 ? rankOf(o.square) > rankOf(p.square) : rankOf(o.square) < rankOf(p.square)));
}

/** The pawn is not lost to the other king's next move: it is the owner's move,
 *  or the other king does not touch it, or the owner's king guards it. */
function pawnSafe(c: Chess, pawn: Man, kings: Record<Color, Square>): boolean {
  const them = otherSide(pawn.color);
  if (c.turn() === pawn.color) return true;
  if (cheb(kings[them], pawn.square) > 1) return true;
  return cheb(kings[pawn.color], pawn.square) <= 1;
}

/** THE KEY SQUARES on a board, kings and pawns only: the strongest read for
 *  each passed pawn, the student's pawns first. Null when none says anything. */
export function keySquaresOn(fen: string, student: Color): KeySquareRead | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const all = men(c);
  if (all.some((m) => m.type !== 'k' && m.type !== 'p')) return null;
  const kingsList = all.filter((m) => m.type === 'k');
  if (kingsList.length !== 2) return null;
  const wk = kingsList.find((k) => k.color === 'w');
  const bk = kingsList.find((k) => k.color === 'b');
  if (!wk || !bk) return null;
  const kings: Record<Color, Square> = { w: wk.square, b: bk.square };
  const pawns = all.filter((m) => m.type === 'p');
  const opp = (() => { try { return readOpposition(fen); } catch { return null; } })();
  const reads: KeySquareRead[] = [];
  for (const pawn of pawns) {
    if (!isPassedPawn(all, pawn)) continue;
    const keys = pawnKeySquares(pawn.square, pawn.color).filter((s) => !all.some((m) => m.square === s && m.type === 'p'));
    if (keys.length === 0) continue;
    const owner = pawn.color;
    const them = otherSide(owner);
    const king = kings[owner];
    const kpk = pawns.length === 1;
    const theorem = (k: Square): boolean => kpk && cheb(k, pawn.square) <= 2 && (cheb(k, pawn.square) <= 1 || cheb(kings[them], pawn.square) >= 3);
    const base = { side: owner, pawn: pawn.square, keys, king };
    const keyStr = `key-squares:${pawn.square}:${fen.split(' ').slice(0, 2).join(' ')}`;
    if (keys.includes(king) && pawnSafe(c, pawn, kings)) {
      reads.push({ ...base, kind: 'holds', to: [king], queens: theorem(king), noSpare: false, key: `${keyStr}:holds` });
      continue;
    }
    if (opp && opp.holder === owner && opp.spare.length === 0) {
      const to = opp.entry.filter((s) => keys.includes(s));
      if (to.length > 0) { reads.push({ ...base, kind: 'opposition', to, queens: to.every((s) => theorem(s)), noSpare: opp.moverPawns > 0, key: `${keyStr}:opposition` }); continue; }
    }
    if (c.turn() === owner) {
      const to = [...new Set(c.moves({ verbose: true }).filter((m) => m.piece === 'k' && keys.includes(m.to)).map((m) => m.to))].sort();
      if (to.length > 0) reads.push({ ...base, kind: 'steps', to, queens: to.every((s) => theorem(s)), noSpare: false, key: `${keyStr}:steps` });
    }
  }
  if (reads.length === 0) return null;
  const rank = (r: KeySquareRead): number => (r.side === student ? 0 : 3) + (r.kind === 'holds' ? 0 : r.kind === 'opposition' ? 1 : 2);
  return reads.sort((a, b) => rank(a) - rank(b))[0];
}

/** THE KEY SQUARES IN WORDS, from the student's seat. */
export function keySquareLine(r: KeySquareRead, student: Color): string {
  const mine = r.side === student;
  const k = stemKeyOf(r.key);
  const pawnName = `the ${r.pawn[0]}-pawn`;
  const Owner = mine ? 'Your' : 'Their';
  const parts: string[] = [];
  if (r.kind === 'holds') {
    parts.push(rotateStem([
      `${Owner} king on ${r.king} stands on a key square of ${pawnName}.`,
      `${Owner} king has reached ${r.king}, a key square of ${pawnName}.`,
    ], k));
  } else if (r.kind === 'opposition') {
    const dest = orList(r.to);
    parts.push(mine
      ? (r.noSpare ? `You hold the opposition, and they have no pawn move to spare.` : `You hold the opposition.`)
      : (r.noSpare ? `They hold the opposition, and you have no pawn move to spare.` : `They hold the opposition.`));
    parts.push(mine
      ? `Whichever way their king steps, yours goes to ${dest}, ${r.to.length === 1 ? 'a key square' : 'each a key square'} of ${pawnName}.`
      : `Whichever way your king steps, theirs goes to ${dest}, ${r.to.length === 1 ? 'a key square' : 'each a key square'} of ${pawnName}.`);
  } else {
    parts.push(rotateStem([
      `${Owner} king can step to ${orList(r.to)}, ${r.to.length === 1 ? 'a key square' : 'each a key square'} of ${pawnName}.`,
      `${Owner} king is one step from ${orList(r.to)}, ${r.to.length === 1 ? 'a key square' : 'each a key square'} of ${pawnName}.`,
    ], k));
  }
  if (r.queens) {
    parts.push(rotateStem([
      `With the king there, the pawn queens whoever is to move.`,
      `A king on a key square takes a lone pawn through against the king alone, whoever has the move.`,
    ], k));
  } else if (r.kind === 'holds') {
    parts.push(`The pawn's key squares are ${andList(r.keys)}.`);
  }
  return parts.join(' ');
}

/** The squares a read lights: the pawn, the key squares the king has or gets. */
export function keySquareSquares(r: KeySquareRead): Square[] {
  return [r.pawn, ...r.to];
}
