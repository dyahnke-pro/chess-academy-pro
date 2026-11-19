// coordinationGap — ONE ARMY WORKS TOGETHER, THE OTHER IS SCATTERED (Danya have-check, 2026-11-19).
//
// Danya: "White's army is excellently coordinated"; "Black's pieces are
// scattered across the board (uncoordinated)"; "Black's pieces lack
// coordination — the knight on a6 is stranded"; "White's pieces are dreadfully
// uncoordinated". The king-zone count is `kingSiege` and the worst piece is one
// piece; nothing compared the two armies as a whole.
//
// The read, chess.js and the engine's score: each side's pieces (knights,
// bishops, rooks, queen) are counted LOOSE (nothing of its own guards it) or
// IDLE (`pieceWork` under four: it hits next to nothing that matters). It fires
// when one side has no loose piece and at most one idle one, the other has two
// or more pieces loose or idle, and the engine has the coordinated side at
// least most of a pawn better. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { pieceWork } from './pieceWork';
import { isMinorAtHome } from './development';
import { type EngineLine, PIECE_NAME, lineScore, other, sortedLines } from './engineLineRead';
import { andList } from '../utils/andList';

export interface CoordinationGap { side: Color; loose: Square[]; idle: Square[]; text: string; squares: Square[] }

const IDLE_WORK = 4;

function army(c: Chess, col: Color): { loose: Square[]; idle: Square[]; count: number } {
  const loose: Square[] = []; const idle: Square[] = [];
  let count = 0;
  for (const p of c.board().flat()) {
    if (!p || p.color !== col || p.type === 'k' || p.type === 'p') continue;
    count++;
    // A rook on its own back rank waits for a file, and a minor at home is
    // development: neither is a scattered piece.
    const back = col === 'w' ? '1' : '8';
    if (p.type === 'r' && p.square[1] === back) continue;
    if (isMinorAtHome(p.type, col, p.square)) continue;
    if (c.attackers(p.square, col).length === 0) loose.push(p.square);
    else if (pieceWork(c, p.square, p.type, col) < IDLE_WORK) idle.push(p.square);
  }
  return { loose, idle, count };
}

export function coordinationGap(fen: string, lines: readonly EngineLine[], student: Color): CoordinationGap | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  // Out of the opening (move 15 on): rooks at home and minors not yet out
  // are development, not a scattered army.
  if (c.inCheck() || Number(fen.split(' ')[5] ?? '0') < 15) return null;
  for (const good of ['w', 'b'] as Color[]) {
    const bad = other(good);
    const g = army(c, good); const b = army(c, bad);
    if (g.count < 3 || b.count < 3 || g.loose.length || g.idle.length > 1) continue;
    if (b.loose.length + b.idle.length < 2) continue;
    const ls = sortedLines(lines, good);
    if (!ls.length || lineScore(ls[0], good) < 80) continue;
    const whose = good === student ? 'the' : 'your';
    const name = (s: Square): string => `${whose} ${PIECE_NAME[c.get(s)?.type ?? 'p']} on ${s}`;
    const parts: string[] = [];
    if (b.idle.length) parts.push(`${andList(b.idle.map(name))} ${b.idle.length === 1 ? 'does' : 'do'} next to nothing`);
    if (b.loose.length) parts.push(`${andList(b.loose.map(name))} ${b.loose.length === 1 ? 'has' : 'have'} no guard`);
    const scattered = parts.join(', and ');
    const text = good === student
      ? `Your pieces work together: every one is guarded and in the game. Theirs are scattered: ${scattered}.`
      : `Their pieces work together: every one is guarded and in the game. Yours are scattered: ${scattered}.`;
    return { side: good, loose: b.loose, idle: b.idle, text, squares: [...b.loose, ...b.idle] };
  }
  return null;
}
