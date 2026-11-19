// zugzwangIfPassed — THEY WOULD BE IN ZUGZWANG IF IT WERE THEIR MOVE (Danya have-check, 2026-11-19).
//
// Danya: "With Black to move it would be zugzwang: triangulate to lose a
// tempo"; "1.Kd6 Kd8 and 1.Kc5 Kc7 hand Black the opposition". The zugzwang
// reads (`zugzwangRead`, the tablebase `zugzwang.ts`) ask whether the side TO
// MOVE would rather pass. The other half of the technique is the board where
// the OTHER side would be in zugzwang — and the side to move wins by handing
// them the move.
//
// The read, kings and pawns only (at most six men): a small exact-rules search
// of its own (king steps, pawn pushes and captures, a promotion scored as a
// queen and the end of the line), up to thirteen plies, memoised. With the
// other side to move (the null move), every move they have drops material
// within N plies, while the side to move, moving now, wins nothing in N + 1:
// it is a tempo short, and has to lose one. Said to either seat. chess.js only
// reads the board (G0).
import { Chess, type Color } from 'chess.js';
import { other } from './engineLineRead';

export interface ZugzwangIfPassed { side: Color; victim: Color; drops: number; plies: number; text: string }

const MAX_DEPTH = 13;
const MAX_MEN = 6;
const QUEEN = 9;

/** A king-and-pawn board: squares 0..63 (a1 = 0), the side to move. */
interface KP { k: [number, number]; p: [number[], number[]]; turn: 0 | 1 }

const fileOf = (s: number): number => s & 7;
const rankOf = (s: number): number => s >> 3;
const near = (a: number, b: number): boolean => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b))) <= 1;

/** Squares a pawn of side `c` on `s` attacks. */
function pawnHits(s: number, c: 0 | 1): number[] {
  const r = rankOf(s) + (c === 0 ? 1 : -1);
  if (r < 0 || r > 7) return [];
  return [fileOf(s) - 1, fileOf(s) + 1].filter((f) => f >= 0 && f <= 7).map((f) => r * 8 + f);
}
const attackedByPawns = (sq: number, pawns: readonly number[], c: 0 | 1): boolean => pawns.some((p) => pawnHits(p, c).includes(sq));

function keyOf(b: KP): string {
  return `${b.turn}${b.k[0]},${b.k[1]}|${[...b.p[0]].sort((x, y) => x - y).join(',')}|${[...b.p[1]].sort((x, y) => x - y).join(',')}`;
}

/** The score for the side to move: material (own minus other) after best play. */
function search(b: KP, depth: number, tt: Map<string, number>): number {
  const me = b.turn; const op = (1 - me) as 0 | 1;
  if (depth === 0) return b.p[me].length - b.p[op].length;
  const key = `${keyOf(b)}|${depth}`;
  const hit = tt.get(key);
  if (hit !== undefined) return hit;
  const occupied = new Set<number>([b.k[0], b.k[1], ...b.p[0], ...b.p[1]]);
  const inCheck = attackedByPawns(b.k[me], b.p[op], op);
  let best = -Infinity;
  const take = (v: number): void => { if (v > best) best = v; };
  // King steps.
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const f = fileOf(b.k[me]) + df; const r = rankOf(b.k[me]) + dr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const t = r * 8 + f;
    if (b.p[me].includes(t) || near(t, b.k[op]) || attackedByPawns(t, b.p[op].filter((x) => x !== t), op)) continue;
    const k: [number, number] = [b.k[0], b.k[1]]; k[me] = t;
    const p: [number[], number[]] = [b.p[0], b.p[1]]; p[op] = b.p[op].filter((x) => x !== t);
    take(-search({ k, p, turn: op }, depth - 1, tt));
  }
  // Pawn moves (in check from a pawn, only the capture of the checker).
  const checker = inCheck ? b.p[op].find((x) => pawnHits(x, op).includes(b.k[me])) : undefined;
  const dir = me === 0 ? 8 : -8;
  for (const s of b.p[me]) {
    const targets: Array<{ to: number; capture: boolean }> = [];
    if (!inCheck) {
      const one = s + dir;
      if (one >= 0 && one < 64 && !occupied.has(one)) {
        targets.push({ to: one, capture: false });
        const two = s + 2 * dir;
        if (rankOf(s) === (me === 0 ? 1 : 6) && !occupied.has(two)) targets.push({ to: two, capture: false });
      }
    }
    for (const t of pawnHits(s, me)) if (b.p[op].includes(t) && (!inCheck || t === checker)) targets.push({ to: t, capture: true });
    for (const { to, capture } of targets) {
      const mine = b.p[me].filter((x) => x !== s);
      const theirs = capture ? b.p[op].filter((x) => x !== to) : b.p[op];
      if (rankOf(to) === (me === 0 ? 7 : 0)) {
        // A promotion ends the line: a queen, unless their king takes it at once.
        const lost = near(to, b.k[op]) && !near(to, b.k[me]);
        take(mine.length - theirs.length + (lost ? 0 : QUEEN));
        continue;
      }
      const p: [number[], number[]] = [b.p[0], b.p[1]]; p[me] = [...mine, to]; p[op] = theirs;
      take(-search({ k: b.k, p, turn: op }, depth - 1, tt));
    }
  }
  if (best === -Infinity) best = 0; // stalemate (a pawn cannot mate a king here)
  tt.set(key, best);
  return best;
}

function readKP(c: Chess): KP | null {
  const k: [number, number] = [-1, -1]; const p: [number[], number[]] = [[], []];
  for (const cell of c.board().flat()) {
    if (!cell) continue;
    const s = (Number(cell.square[1]) - 1) * 8 + (cell.square.charCodeAt(0) - 97);
    const side = cell.color === 'w' ? 0 : 1;
    if (cell.type === 'k') k[side] = s; else if (cell.type === 'p') p[side].push(s); else return null;
  }
  if (k[0] < 0 || k[1] < 0) return null;
  return { k, p, turn: c.turn() === 'w' ? 0 : 1 };
}

export function zugzwangIfPassed(fen: string, student: Color): ZugzwangIfPassed | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.board().flat().filter(Boolean).length > MAX_MEN || c.inCheck() || c.isGameOver()) return null;
  const b = readKP(c);
  if (!b || (!b.p[0].length && !b.p[1].length)) return null;
  const side = c.turn(); const victim = other(side);
  const passed: KP = { k: b.k, p: b.p, turn: (1 - b.turn) as 0 | 1 };
  if (attackedByPawns(passed.k[passed.turn], passed.p[b.turn], b.turn)) return null;
  const tt = new Map<string, number>();
  const victimNow = passed.p[passed.turn].length - passed.p[b.turn].length;
  // The fewest plies in which every move they have drops material.
  let plies = 0; let drops = 0;
  for (let d = 2; d <= MAX_DEPTH; d++) {
    const v = search(passed, d, tt);
    if (v < victimNow) { plies = d; drops = victimNow - v; break; }
  }
  if (!plies) return null;
  // Moving now, the side to move wins nothing in one ply more: a tempo short.
  if (search(b, plies + 1, tt) > -victimNow) return null;
  const what = drops === 1 ? 'a pawn' : 'material';
  const text = side === student
    ? `If it were their move here, every move they have would drop ${what}: they would be in zugzwang. So give them the move — lose a tempo with your king and come back to this position with them to move.`
    : `If it were your move here, every move you have would drop ${what}. Don't let them hand you the move: keep your king where this position never comes back with you to move.`;
  return { side, victim, drops, plies, text };
}
