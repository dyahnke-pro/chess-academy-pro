// castlingWing — WHICH WAY TO CASTLE, READ OFF THEIR PAWNS (Danya's speedruns,
// 2026-11-17: "Castle long: Black's g- and h-pawns are gone, so castling short
// hands him open files to attack" · "castle long so he gets no attack against
// your king").
//
// On the castling move itself, either seat: the files the king goes to
// (short: f, g, h · long: b, c, d) against the other wing's. A file with no
// pawn of the OTHER side on it is a road for their rooks toward that king.
//   • AWAY: the king castles to a wing where they still have a pawn on every
//     file, and on the other wing two or more of those files have none.
//   • INTO: the king castles where two or more of those files have none of
//     their pawns, and they still have a rook to use them.
// Nothing else: a wing with one road is the ordinary game.
//
// PURE: chess.js.
import { openSentence } from '../utils/openSentence';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

type Wing = 'k' | 'q';

const WING_FILES: Record<Wing, readonly string[]> = { k: ['f', 'g', 'h'], q: ['b', 'c', 'd'] };
const WING_WORD: Record<Wing, string> = { k: 'short', q: 'long' };

export interface CastlingWingRead {
  kind: 'away' | 'into';
  key: string;
  text: string;
  squares: string[];
  mover: Color;
}

/** The files of `wing` with no pawn of `owner` on them. */
function pawnlessFiles(b: Chess, wing: Wing, owner: Color): string[] {
  return WING_FILES[wing].filter((f) => {
    for (let r = 1; r <= 8; r++) {
      const p = b.get(`${f}${r}` as Square);
      if (p && p.type === 'p' && p.color === owner) return false;
    }
    return true;
  });
}

function hasRook(b: Chess, c: Color): boolean {
  return b.board().some((row) => row.some((p) => !!p && p.color === c && p.type === 'r'));
}

/** The read on a castling move, or null. `student` seats the words. */
export function castlingWing(fenBefore: string, san: string, student: Color): CastlingWingRead | null {
  let after: Chess;
  let mv: Move;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  const wing: Wing | null = mv.isKingsideCastle() ? 'k' : mv.isQueensideCastle() ? 'q' : null;
  if (!wing) return null;
  const mover = mv.color;
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  if (!hasRook(after, enemy)) return null;
  const other: Wing = wing === 'k' ? 'q' : 'k';
  const here = pawnlessFiles(after, wing, enemy);
  const there = pawnlessFiles(after, other, enemy);
  const mine = mover === student;
  const you = mine ? 'you' : 'they';
  const yourK = mine ? 'your' : 'their';
  const theirP = mine ? 'their' : 'your';
  const files = (fs: string[]): string => `${andList(fs.map((f) => `${f}-`))}${fs.length > 1 ? 'files' : 'file'}`;
  const rot = stemKeyOf(`${after.fen().split(' ')[0]}:${san}`);
  const kingSq = mv.to;
  if (here.length >= 2) {
    return {
      kind: 'into', mover, key: `castle-wing:into:${mover}${wing}`,
      squares: [kingSq, ...here.map((f) => `${f}${mover === 'w' ? 1 : 8}`)],
      text: rotateStem([
        `Castling ${WING_WORD[wing]} puts ${yourK} king beside the ${files(here)}, where ${theirP} pawns are gone, so ${theirP} rooks have roads to it.`,
        `${cap(yourK)} king castles toward the ${files(here)}. ${cap(theirP)} pawns are gone from them, so those files are open for ${theirP} rooks.`,
      ], rot),
    };
  }
  if (here.length === 0 && there.length >= 2) {
    return {
      kind: 'away', mover, key: `castle-wing:away:${mover}${wing}`,
      squares: [kingSq],
      text: rotateStem([
        `Castling ${WING_WORD[wing]} keeps ${yourK} king off the ${files(there)}: ${theirP} pawns are gone from them, so castling ${WING_WORD[other]} would have given ${theirP} rooks open roads.`,
        `${cap(you)} castle ${WING_WORD[wing]}, away from the ${files(there)}, where ${theirP} pawns are gone and ${theirP} rooks would have open files.`,
      ], rot),
    };
  }
  return null;
}

function cap(s: string): string {
  return openSentence(s);
}
