// defenderInTime — THE PIECE ROUTE TO A PAWN, AND THE KING THAT GETS THERE FIRST (Danya have-check, 2026-11-19).
//
// Danya: "Nd3-b4 to encircle d5 fails to ...Kf7-e6 and ...a5". A plan to win
// a pawn with a knight is a race: the knight's route to a square that hits the
// pawn, against the defending king's walk to a square beside it. The route
// readers (`pieceRoute`, `planSteps`) say where a piece wants to go; nothing
// counted whether the defence gets there in time.
//
// The read, chess.js only, in an ending (no queens): for each knight of the
// side to move and each pawn of theirs nothing guards now, the knight's shortest
// route (never onto a square their pawns hit) to a square that attacks the
// pawn, against their king's shortest walk to a square beside the pawn
// (never next to the other king or onto a square a pawn of the attacker hits).
// The defender is in time when its walk is no longer than the route — the
// knight moves first, the king answers each move. Two moves or more each,
// and the engine's best line does not win that pawn. Said to either seat.
// EVERY knight-and-pawn race on the board is returned, shortest route first —
// not a cap (G4.5): a second loose pawn the defence also reaches is its own fact.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, other, playLine, sortedLines } from './engineLineRead';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface DefenderInTime { side: Color; knight: Square; route: Square[]; pawn: Square; king: Square; walk: Square[]; text: string; squares: Square[] }

const sqAt = (f: number, r: number): Square => `${'abcdefgh'[f]}${r + 1}` as Square;
const fr = (s: string): [number, number] => [s.charCodeAt(0) - 97, Number(s[1]) - 1];
const KNIGHT: Array<[number, number]> = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

function pawnHit(c: Chess, s: Square, by: Color): boolean {
  return c.attackers(s, by).some((a) => c.get(a)?.type === 'p');
}

/** Shortest path (squares after the start) from `from` to any square in `goal`. */
function bfs(from: Square, steps: Array<[number, number]>, ok: (s: Square) => boolean, goal: (s: Square) => boolean, max: number): Square[] | null {
  const prev = new Map<string, string>([[from, '']]);
  let frontier: Square[] = [from];
  for (let d = 1; d <= max && frontier.length; d++) {
    const next: Square[] = [];
    for (const s of frontier) {
      const [f, r] = fr(s);
      for (const [df, dr] of steps) {
        const ff = f + df; const rr = r + dr;
        if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
        const t = sqAt(ff, rr);
        if (prev.has(t) || !ok(t)) continue;
        prev.set(t, s);
        if (goal(t)) {
          const path: Square[] = [t];
          let cur: string = s;
          while (cur !== from) { path.unshift(cur as Square); cur = prev.get(cur) ?? from; }
          return path;
        }
        next.push(t);
      }
    }
    frontier = next;
  }
  return null;
}

export function defenderInTime(fen: string, lines: readonly EngineLine[], student: Color): DefenderInTime[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  if (c.inCheck()) return [];
  const cells = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p);
  if (cells.some((p) => p.type === 'q')) return [];
  const side = c.turn(); const them = other(side);
  const theirKing = c.findPiece({ type: 'k', color: them })[0];
  const myKing = c.findPiece({ type: 'k', color: side })[0];
  if (!theirKing || !myKing) return [];
  const ls = sortedLines(lines, side);
  if (!ls.length) return [];
  const won = new Set(playLine(fen, ls[0].moves, 8).moves.filter((m) => m.color === side && m.captured === 'p').map((m) => m.to));
  const found: DefenderInTime[] = [];
  for (const n of cells.filter((p) => p.type === 'n' && p.color === side)) {
    for (const pawn of cells.filter((p) => p.type === 'p' && p.color === them)) {
      // A loose pawn: nothing of theirs guards it now, so the race decides it.
      if (won.has(pawn.square) || c.attackers(pawn.square, them).length > 0) continue;
      const hitsPawn = (s: Square): boolean => KNIGHT.some(([df, dr]) => { const [f, r] = fr(s); const ff = f + df; const rr = r + dr; return ff >= 0 && ff < 8 && rr >= 0 && rr < 8 && sqAt(ff, rr) === pawn.square; });
      const route = bfs(n.square, KNIGHT, (s) => { const p = c.get(s); return (!p || p.color !== side) && !pawnHit(c, s, them); }, hitsPawn, 4);
      if (!route || route.length < 2) continue;
      const [pf, pr] = fr(pawn.square);
      const beside = (s: Square): boolean => { const [f, r] = fr(s); return Math.max(Math.abs(f - pf), Math.abs(r - pr)) === 1; };
      const walk = bfs(theirKing, KING, (s) => {
        const p = c.get(s);
        const [f, r] = fr(s); const [kf, kr] = fr(myKing);
        return (!p || p.color !== them) && Math.max(Math.abs(f - kf), Math.abs(r - kr)) > 1 && !pawnHit(c, s, side);
      }, beside, route.length);
      if (!walk || walk.length < 2 || walk.length > route.length) continue;
      const mineSide = side === student;
      const knightWords = mineSide ? 'your knight' : 'their knight';
      const kingWords = mineSide ? 'their king' : 'your king';
      const NUM = ['no', 'one', 'two', 'three', 'four'];
      const via = (path: Square[]): string => (path.length === 1 ? path[0] : `${path.slice(0, -1).join(', ')} and ${path[path.length - 1]}`);
      // Rotated on the board and the pawn (never rolled), so two races on one
      // board do not open on the same stem.
      const stems = [
        `Going after the pawn on ${pawn.square} with ${knightWords} takes ${NUM[route.length]} moves (${via(route)}). ${cap(kingWords)} gets beside it in ${NUM[walk.length]} (${via(walk)}). The defence arrives in time, so the pawn is not a real target yet.`,
        `The pawn on ${pawn.square} looks loose, but ${knightWords} needs ${NUM[route.length]} moves to hit it (${via(route)}). ${cap(kingWords)} covers it in ${NUM[walk.length]} (${via(walk)}), so it is not a real target yet.`,
        `${cap(knightWords)} can head for the pawn on ${pawn.square} in ${NUM[route.length]} moves (${via(route)}). ${cap(kingWords)} is there in ${NUM[walk.length]} (${via(walk)}). The defence is in time, so the pawn holds for now.`,
      ];
      const text = rotateStem(stems, stemKeyOf(fen) + found.length);
      found.push({ side, knight: n.square, route, pawn: pawn.square, king: theirKing, walk, text, squares: [n.square, ...route, pawn.square, theirKing, ...walk] });
    }
  }
  // Shortest race first; a tie keeps the board's order (stable sort).
  return found.sort((a, b) => a.route.length - b.route.length);
}
