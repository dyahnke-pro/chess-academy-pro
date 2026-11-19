// kingActivityGap — WHOSE KING IS THE FIGHTING PIECE (Danya have-check, 2026-11-19).
//
// Danya: "In the endgame the king should be active rather than safe";
// "progress needs the white king to come and support the rooks". The ending
// reads count pawn races and king races to one square (`kingRace`,
// `kingCourse`); nothing compared the two kings themselves.
//
// The read, chess.js and the engine's score: an ending (no queens, at most two
// pieces besides king and pawns a side); each king's distance to the centre
// (the nearest of d4, d5, e4, e5, in king steps) and to the nearest enemy pawn.
// It fires when one king is two or more steps closer on both counts, and the
// engine agrees that king's side stands at least level. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, lineScore, other, sortedLines } from './engineLineRead';

export interface KingActivityGap { active: Color; activeKing: Square; passiveKing: Square; activeCentre: number; passiveCentre: number; text: string; squares: Square[] }

const dist = (a: string, b: string): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
const centre = (s: string): number => Math.min(...['d4', 'd5', 'e4', 'e5'].map((c) => dist(s, c)));

export function kingActivityGap(fen: string, lines: readonly EngineLine[] | null, student: Color): KingActivityGap | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const pieces = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p);
  if (pieces.some((p) => p.type === 'q')) return null;
  for (const col of ['w', 'b'] as Color[]) if (pieces.filter((p) => p.color === col && p.type !== 'p' && p.type !== 'k').length > 2) return null;
  const wk = c.findPiece({ type: 'k', color: 'w' })[0] as Square | undefined; const bk = c.findPiece({ type: 'k', color: 'b' })[0] as Square | undefined;
  if (!wk || !bk) return null;
  const king: Record<Color, Square> = { w: wk, b: bk };
  const pawnDist = (col: Color): number => {
    const ps = pieces.filter((p) => p.type === 'p' && p.color !== col);
    return ps.length ? Math.min(...ps.map((p) => dist(king[col], p.square))) : 9;
  };
  for (const active of ['w', 'b'] as Color[]) {
    const passive = other(active);
    const ca = centre(king[active]); const cp = centre(king[passive]);
    if (cp - ca < 2 || pawnDist(passive) - pawnDist(active) < 2) continue;
    // `lines` null: posed by the count alone (the record keeps no score).
    if (lines) {
      const ls = sortedLines(lines, active);
      if (!ls.length || lineScore(ls[0], active) < -30) continue;
    }
    const a = king[active]; const p = king[passive];
    const NUM = ['no', 'one', 'two', 'three', 'four'];
    const steps = (n: number): string => (n === 0 ? 'in the centre' : `${NUM[n] ?? n} step${n === 1 ? '' : 's'} from the centre`);
    const text = active === student
      ? `Your king on ${a} is the fighting piece here: it is ${steps(ca)}, while theirs on ${p} is ${steps(cp)}. In an ending that is a big plus — keep using your king.`
      : `Their king on ${a} is the more active king: it is ${steps(ca)}, while yours on ${p} is ${steps(cp)}. In an ending your king has to come forward and fight.`;
    return { active, activeKing: a, passiveKing: p, activeCentre: ca, passiveCentre: cp, text, squares: [a, p] };
  }
  return null;
}
