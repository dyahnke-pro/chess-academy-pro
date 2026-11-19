// kingInOpen — A KING OFF ITS SHELTER, WITH CHECKS AGAINST IT (Danya have-check, 2026-11-19).
//
// Danya: "With the king exposed, material equality doesn't matter"; "Black's
// king on g5 is very exposed"; "White's king exposed — Black has the
// long-term play". The king-safety reads look at a CASTLED king whose shelter
// broke (`detectKingExposure`) or an uncastled king in the centre
// (`detectCentralKingDanger`); a king that has walked or been driven up the
// board, out from behind its pawns, was read by neither.
//
// The read, chess.js and the engine's score: queens on; the king stands off
// its castled squares (or off its two back ranks), at most one file around it
// still has a pawn of its own in front (`kingCover`), and two or more of the
// other side's pieces can give it check (on the board as it is, or given the
// move). Said only where the engine agrees the attacking side stands at least
// level. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { kingCover } from './kingSafety';
import { sideToMoveAs } from './threatOut';
import { type EngineLine, PIECE_NAME, lineScore, other, sortedLines } from './engineLineRead';
import { andList } from '../utils/andList';

export interface KingInOpen { side: Color; king: Square; cover: number; checkers: Square[]; text: string; squares: Square[] }

/** The pieces (not pawns or the king) that can give `attacker`'s check, and
 *  how many different checks they have between them. */
function checkingPieces(fen: string, attacker: Color): { from: Square[]; checks: number } {
  const none = { from: [], checks: 0 };
  const asAttacker = sideToMoveAs(fen, attacker);
  if (!asAttacker) return none;
  let c: Chess;
  try { c = new Chess(asAttacker); } catch { return none; }
  if (c.inCheck()) return none;
  const out = new Set<Square>();
  let checks = 0;
  for (const m of c.moves({ verbose: true })) {
    if (m.piece === 'p' || m.piece === 'k' || !(m.san.includes('+') || m.san.includes('#'))) continue;
    out.add(m.from); checks++;
  }
  return { from: [...out], checks };
}

/** `lines` null: the record's read of the board the student moves on, which
 *  keeps no engine score — the question (your king in the open, their checks
 *  on it) is posed by the board alone. */
export function kingInOpen(fen: string, lines: readonly EngineLine[] | null, student: Color): KingInOpen | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  for (const side of ['w', 'b'] as Color[]) {
    const attacker = other(side);
    if (!c.findPiece({ type: 'q', color: attacker }).length) continue;
    const cover = kingCover(c, side);
    if (!cover) continue;
    const back = side === 'w' ? Number(cover.kingSquare[1]) <= 2 : Number(cover.kingSquare[1]) >= 7;
    if (cover.castled && back) continue;
    // The centre king that can still castle has its own read
    // (`detectCentralKingDanger`, "get castled"). One that has lost the right
    // has no shelter coming: Danya's king on f1, "not exactly surrounded by a
    // defensive cocoon" (the-terrifying-grinder-of-chess#1), was read by neither.
    const rights = c.getCastlingRights(side);
    if (back && 'cdef'.includes(cover.kingSquare[0]) && (rights.k || rights.q)) continue;
    if (cover.present > 1) continue;
    const { from: checkers, checks } = checkingPieces(fen, attacker);
    // Two pieces that can check, or one (the queen) with three checks of its own.
    if (checkers.length < 2 && checks < 3) continue;
    if (lines) {
      const ls = sortedLines(lines, attacker);
      if (!ls.length || lineScore(ls[0], attacker) < 0) continue;
    }
    const mine = side === student;
    const all = checkers.length === 1 ? null : checkers.length === 2 ? 'both' : 'all';
    // Three squares in a sentence is a list nobody can hold: past two
    // checkers the pieces are named, and the board lights their squares.
    const names = checkers.map((s) => (checkers.length > 2 ? PIECE_NAME[c.get(s)?.type ?? 'p'] : `${PIECE_NAME[c.get(s)?.type ?? 'p']} on ${s}`));
    const can = all ? `can ${all} give check` : `has ${checks} checks`;
    const coverWords = cover.present === 0 ? 'no pawn of its own in front of it' : 'only one pawn of its own near it';
    const text = mine
      ? `Your king on ${cover.kingSquare} is out in the open, with ${coverWords}. Their ${andList(names)} ${can}, so count that before you count pawns.`
      : `Their king on ${cover.kingSquare} is out in the open, with ${coverWords}. Your ${andList(names)} ${can}, and a king like that matters more than a pawn.`;
    return { side, king: cover.kingSquare as Square, cover: cover.present, checkers, text, squares: [cover.kingSquare as Square, ...checkers] };
  }
  return null;
}
