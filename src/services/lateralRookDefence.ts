// lateralRookDefence — THE ACTIVE ROOK THAT SWINGS BACK TO DEFEND (Danya have-check, 2026-11-19).
//
// Danya (rooks-on-the-seventh-revisited#1): "When the occasion called for it,
// Pantsulaia did not hesitate to make them fulfill a defensive duty on the
// g-file" — two rooks raiding the second rank, and one of them slides along it
// to a file where it guards the pawn the enemy rook is hitting. The rook reads
// say a rook is active or passive; nothing read the active rook that defends
// from where it stands, sideways, without retreating.
//
// The read, the engine's best line and chess.js only (G0): a rook of the side
// to move on the other side's half; in that side's first four moves of the
// best line the rook moves along its rank (only ever along it, never back
// down the file) to a
// square from which it guards a pawn or piece of its own side that an enemy
// piece attacks, one it did not guard before. The side stands at least level
// by the line. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, PIECE_NAME, lineScore, playLine, sortedLines } from './engineLineRead';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface LateralRookDefence { side: Color; from: Square; to: Square; guards: Square; text: string; squares: Square[] }

const inTheirHalf = (sq: string, side: Color): boolean => (side === 'w' ? Number(sq[1]) >= 5 : Number(sq[1]) <= 4);

export function lateralRookDefence(fen: string, lines: readonly EngineLine[], student: Color): LateralRookDefence | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const ls = sortedLines(lines, side);
  if (!ls.length || lineScore(ls[0], side) < -30) return null;
  const { moves, boards } = playLine(fen, ls[0].moves, 8);
  // Where each moving piece started on the board read (the rook is named by its square now).
  const origin = new Map<string, Square>();
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const start = origin.get(m.from) ?? m.from;
    origin.delete(m.from); origin.set(m.to, start);
    if (i % 2 === 1) continue;
    if (m.color !== side || m.piece !== 'r' || m.from[1] !== m.to[1] || start[1] !== m.to[1] || !inTheirHalf(m.from, side)) continue;
    const before = new Chess(boards[i]); const after = new Chess(boards[i + 1]);
    for (const p of after.board().flat()) {
      if (!p || p.color !== side || p.type === 'k' || p.square === m.to) continue;
      if (!after.attackers(p.square, side).includes(m.to)) continue;
      if (before.attackers(p.square, side).includes(m.from)) continue;
      if (after.attackers(p.square, side === 'w' ? 'b' : 'w').length === 0) continue;
      const you = side === student;
      const whose = you ? 'your' : 'their';
      const unit = `${whose} ${PIECE_NAME[p.type]} on ${p.square}`;
      const key = stemKeyOf(`${fen}|lateral-rook`);
      const home = start;
      const text = you
        ? rotateStem([
          `Your rook on ${home} doesn't only attack. In the best line it slides along the rank to ${m.to} and guards ${unit} from there. An active rook can switch to defence without going home.`,
          `The rook on ${home} can do two jobs: it swings across to ${m.to} and covers ${unit}. A raiding rook defends sideways when it has to.`,
        ], key)
        : rotateStem([
          `Their rook on ${home} isn't only attacking. It can slide across to ${m.to} and guard ${unit}, so that target is not as loose as it looks.`,
          `Don't count on ${unit} falling: their rook on ${home} swings along the rank to ${m.to} and guards it. A raiding rook can defend sideways.`,
        ], key);
      return { side, from: home, to: m.to, guards: p.square, text, squares: [home, m.to, p.square] };
    }
  }
  return null;
}
