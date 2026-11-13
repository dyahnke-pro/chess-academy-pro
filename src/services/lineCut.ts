// WHAT THE MOVE CUTS (gap B3, "what a move gives up", David 2026-11-12: "I
// want the gap filled"). Theory: "Bd3 cuts the queen off from d4", "…Nd7
// blocks the bishop's diagonal". Computed: a queen, rook or bishop of the
// mover saw a centre square, a piece of its own (a guard) or one of theirs
// (an attack) before the move, and no longer does because the moved piece
// now stands on the line between. Pure (chess.js). Both seats.
import { Chess, type Color, type Square } from 'chess.js';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);

export interface LineCut {
  /** The piece whose line is cut, from the mover's seat. */
  piece: string;
  /** What it no longer sees: "the d4 square", "your pawn on e4", "their knight on c6". */
  lost: string;
  squares: string[];
}

function onLineBetween(a: string, b: string, x: string): boolean {
  const [af, ar, bf, br, xf, xr] = [a.charCodeAt(0), Number(a[1]), b.charCodeAt(0), Number(b[1]), x.charCodeAt(0), Number(x[1])];
  const df = Math.sign(bf - af), dr = Math.sign(br - ar);
  if (!(af === bf || ar === br || Math.abs(bf - af) === Math.abs(br - ar))) return false;
  for (let f = af + df, r = ar + dr; f !== bf || r !== br; f += df, r += dr) if (f === xf && r === xr) return true;
  return false;
}

export function lineCut(fenBefore: string, san: string, mine: boolean): LineCut | null {
  let before: Chess;
  let after: Chess;
  let to: string;
  let movedFrom: string;
  let mover: Color;
  try { before = new Chess(fenBefore); mover = before.turn(); after = new Chess(fenBefore); const mv = after.move(san); if (mv.captured) return null; to = mv.to; movedFrom = mv.from; } catch { return null; }
  const own = mine ? 'your' : 'their', other = mine ? 'their' : 'your';
  for (const row of before.board()) for (const cell of row) {
    if (!cell || cell.color !== mover || !'bqr'.includes(cell.type)) continue;
    const from = cell.square;
    const candidates: Array<{ sq: string; lost: string; weight: number }> = [];
    for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
      const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
      // The moved piece's own square is not a piece left behind (Kasparov–
      // Karpov 1985 g24, e5: "cuts your rook off from your pawn on e4" —
      // the pawn on e4 was the one that moved).
      if (sq === to || sq === from || sq === movedFrom) continue;
      if (!onLineBetween(from, sq, to)) continue;
      const sawBefore = before.attackers(sq, mover).includes(from);
      const seesAfter = after.attackers(sq, mover).includes(from);
      if (!sawBefore || seesAfter) continue;
      const occ = before.get(sq);
      if (occ && occ.color === mover && occ.type !== 'k' && (CENTER.has(sq) || after.attackers(sq, mover === 'w' ? 'b' : 'w').length > 0)) candidates.push({ sq, lost: `${own} ${NAME[occ.type]} on ${sq}`, weight: 3 });
      else if (occ && occ.color !== mover && occ.type !== 'p') candidates.push({ sq, lost: `${other} ${NAME[occ.type]} on ${sq}`, weight: 2 });
      else if (!occ && CENTER.has(sq)) candidates.push({ sq, lost: sq, weight: 1 });
    }
    candidates.sort((a, b) => b.weight - a.weight);
    if (candidates[0]) return { piece: `${own} ${NAME[cell.type]}`, lost: candidates[0].lost, squares: [from, to, candidates[0].sq] };
  }
  return null;
}
