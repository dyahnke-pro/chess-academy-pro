// castlingTakenAway — THE MOVE THAT TOOK CASTLING AWAY (Danya's speedruns,
// 2026-11-17: "f3 opens the g1–a7 diagonal; with Black's bishop on c5, White
// can no longer castle short" · "retake with the bishop: on b4 it covers f8
// and stops Black castling" · "recapture with the f-pawn: the open f-file
// covers f1, so White can no longer castle").
//
// The move just played, either seat, newly puts a square the king must cross
// or land on (f1/g1, d1/c1 and Black's mirror) under an enemy piece, on a wing
// that side still has the right to castle to and that nothing covered before.
// Two ways it happens, both read the same: a piece lands where it sees the
// square, or a move opens the line to it (the mover's own f-pawn leaving f2).
// The pieces still standing between king and rook do not matter: the square
// will be covered when they are gone, which is what he says.
//
// A square with a piece on it is not read: covering it attacks that piece,
// which the threat reads say. Never said while that king is in check (a check is answered first, and the
// checker usually leaves), or when the side denied can take the covering
// piece and come out ahead — then the cover is one move deep, not a fact.
//
// PURE: chess.js and the one capture count (`legalSeeGainFor`).
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

type Wing = 'k' | 'q';

/** The squares a king crosses, then lands on, castling each way. */
const TRANSIT: Record<Color, Record<Wing, readonly [string, string]>> = {
  w: { k: ['f1', 'g1'], q: ['d1', 'c1'] },
  b: { k: ['f8', 'g8'], q: ['d8', 'c8'] },
};
const WING_WORD: Record<Wing, string> = { k: 'short', q: 'long' };

export interface CastlingTaken {
  /** Say-once key: whose castling, which wing. */
  key: string;
  text: string;
  /** The covering piece and the square it covers. */
  squares: string[];
  /** The side whose castling is gone. */
  denied: Color;
  wing: Wing;
  /** True when the mover took away their own castling. */
  ownGoal: boolean;
}

function rights(fen: string, c: Color): Wing[] {
  const r = fen.split(' ')[2] ?? '-';
  const out: Wing[] = [];
  if (r.includes(c === 'w' ? 'K' : 'k')) out.push('k');
  if (r.includes(c === 'w' ? 'Q' : 'q')) out.push('q');
  return out;
}

function attackers(b: Chess, sq: string, by: Color): Square[] {
  try { return b.attackers(sq as Square, by); } catch { return []; }
}

/** The castling the move just played took away, or null. `student` seats the
 *  words: the student's castling is "you", theirs is "they". */
export function castlingTakenAway(fenBefore: string, san: string, student: Color): CastlingTaken | null {
  let before: Chess;
  let after: Chess;
  let mv: Move;
  try {
    before = new Chess(fenBefore);
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  const fenAfter = after.fen();
  const mover = mv.color;
  for (const denied of [mover === 'w' ? 'b' : 'w', mover] as Color[]) {
    // A king in check answers the check first; the checker usually leaves.
    if (after.turn() === denied && after.inCheck()) continue;
    const enemy: Color = denied === 'w' ? 'b' : 'w';
    for (const wing of rights(fenAfter, denied)) {
      const path = TRANSIT[denied][wing];
      if (path.some((sq) => attackers(before, sq, enemy).length > 0)) continue;
      for (const sq of path) {
        // A piece standing there is attacked, which is the threat reads' to
        // say; the castling claim is about an empty square.
        if (after.get(sq as Square)) continue;
        const by = attackers(after, sq, enemy);
        if (by.length === 0) continue;
        // The piece doing it: the one that moved (a castled rook moved too),
        // else the one whose line opened.
        const moved = [mv.to, ...(mv.isKingsideCastle() ? [mover === 'w' ? 'f1' : 'f8'] : mv.isQueensideCastle() ? [mover === 'w' ? 'd1' : 'd8'] : [])];
        const from = by.find((x) => moved.includes(x)) ?? by[0];
        const piece = after.get(from);
        if (!piece || piece.type === 'k') continue;
        // A cover the denied side wins back at once is one move deep.
        if (legalSeeGainFor(fenAfter, from, denied) > 0) return null;
        const ownGoal = mover === denied;
        return {
          key: `castling-taken:${denied}${wing}`,
          text: sentence({ mv, from, moved: moved.includes(from), sq, wing, piece: PIECE_NAMES[piece.type], denied, student, ownGoal, fen: fenAfter }),
          squares: [from, sq],
          denied, wing, ownGoal,
        };
      }
    }
  }
  return null;
}

function sentence(a: { mv: Move; from: string; moved: boolean; sq: string; wing: Wing; piece: string; denied: Color; student: Color; ownGoal: boolean; fen: string }): string {
  const deniedYou = a.denied === a.student;
  const who = deniedYou ? 'you' : 'they';
  const kingOf = deniedYou ? 'your' : 'their';
  const coverOwner = deniedYou ? 'their' : 'your';
  const role = a.sq[0] === 'f' || a.sq[0] === 'd' ? 'has to cross' : 'lands on';
  const wing = WING_WORD[a.wing];
  const key = stemKeyOf(`${a.fen}:${a.sq}`);
  const coverer = `${coverOwner} ${a.piece} on ${a.from}`;
  if (a.moved) {
    // The piece that moved covers the square.
    return rotateStem([
      `${cap(coverer)} now sees ${a.sq}, so ${who} can't castle ${wing} while it stays there.`,
      `${cap(who)} can't castle ${wing} now: ${coverer} covers ${a.sq}, a square ${kingOf} king ${role}.`,
    ], key);
  }
  // A move opened the line to it — the mover's own, or theirs.
  const opener = a.mv.color === a.student ? 'Your move' : 'Their move';
  return rotateStem([
    `${opener} opens the line from ${coverer} to ${a.sq}, so ${who} can't castle ${wing} while it stays there.`,
    `With that line open, ${coverer} sees ${a.sq}, a square ${kingOf} king ${role}. ${cap(who)} can't castle ${wing} while it stays there.`,
  ], key);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
