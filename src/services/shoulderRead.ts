// shoulderRead — THE KING SHOULDERED AWAY, THE KING CUT OFF (Danya: "White's
// king is pushed away from the e-pawn").
//
// A king that wants a passed pawn — the other side's, to stop it (to reach the
// squares in front of it), or its own, to guard it (a square beside it) — is
// kept away by a piece of the other side: their king standing in the road
// (the shoulder), or their rook along a file or rank (the cut-off).
//
// THE COUNT, as the board stands: the king's shortest route in king steps to
// those squares, never onto an occupied square or one the other side attacks,
// counted twice — with the piece where it is, and with that piece lifted off
// the board. The read fires when the piece costs the king two moves or more,
// or shuts it out entirely. A static count: the pieces are where they stand.
//
// Kings, pawns and rooks only. PURE: chess.js reads the board.
import { openSentence } from '../utils/openSentence';
import { Chess, type Color, type Square } from 'chess.js';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { countWord } from '../utils/andList';
import { isPassedPawn } from './keySquareRead';

export interface ShoulderRead {
  /** `path`: the king wants the squares in front of the other side's pawn;
   *  `guard`: the king wants a square beside its own pawn. */
  mode: 'path' | 'guard';
  /** The side whose piece blocks (the shoulder's or the cut-off's owner). */
  side: Color;
  /** The blocking piece. */
  by: 'k' | 'r';
  bySquare: Square;
  /** The king kept away. */
  king: Square;
  pawn: Square;
  /** King steps to the squares as the board stands (null: it cannot get there). */
  steps: number | null;
  /** King steps with the blocking piece lifted off. */
  free: number;
  key: string;
}

interface Man { type: string; color: Color; square: Square }
const fileOf = (s: string): number => s.charCodeAt(0) - 97;
const rankOf = (s: string): number => Number(s[1]);
const sq = (f: number, r: number): Square => `${String.fromCharCode(97 + f)}${r}` as Square;
const otherSide = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const ALL: Square[] = (() => { const o: Square[] = []; for (let r = 1; r <= 8; r += 1) for (let f = 0; f < 8; f += 1) o.push(sq(f, r)); return o; })();

/** Every square `side`'s men attack on `board` (rook rays pass through `ghost`,
 *  the king that is moving, so it cannot hide behind itself). */
function attacked(board: readonly Man[], side: Color, ghost: Square): Set<string> {
  const occ = new Set(board.filter((m) => m.square !== ghost).map((m) => m.square));
  const out = new Set<string>();
  for (const m of board) {
    if (m.color !== side) continue;
    const f = fileOf(m.square); const r = rankOf(m.square);
    if (m.type === 'k') {
      for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
        if ((df || dr) && f + df >= 0 && f + df < 8 && r + dr >= 1 && r + dr <= 8) out.add(sq(f + df, r + dr));
      }
    } else if (m.type === 'p') {
      const nr = r + (side === 'w' ? 1 : -1);
      for (const nf of [f - 1, f + 1]) if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) out.add(sq(nf, nr));
    } else if (m.type === 'r') {
      for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nf = f + df; let nr = r + dr;
        while (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) {
          const s = sq(nf, nr); out.add(s);
          if (occ.has(s)) break;
          nf += df; nr += dr;
        }
      }
    }
  }
  return out;
}

/** The king's fewest steps from `from` to any of `targets` on `board`. */
function kingSteps(board: readonly Man[], king: Man, targets: ReadonlySet<string>): number | null {
  const hit = attacked(board, otherSide(king.color), king.square);
  const occ = new Set(board.filter((m) => m.square !== king.square).map((m) => m.square));
  if (targets.has(king.square)) return 0;
  const seen = new Set<string>([king.square]);
  let frontier: string[] = [king.square];
  for (let d = 1; d <= 16 && frontier.length; d += 1) {
    const next: string[] = [];
    for (const s of frontier) {
      const f = fileOf(s); const r = rankOf(s);
      for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
        if (!df && !dr) continue;
        if (f + df < 0 || f + df > 7 || r + dr < 1 || r + dr > 8) continue;
        const n = sq(f + df, r + dr);
        if (seen.has(n) || occ.has(n) || hit.has(n)) continue;
        if (targets.has(n)) return d;
        seen.add(n); next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

const cheb = (a: string, b: string): number => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

/** The blocking piece really stands between: a king beside the other king
 *  (two squares at most) and nearer the squares it wants; a rook on a file or
 *  rank strictly between the king and the pawn (the wall it makes). */
function standsBetween(by: Man, king: string, pawn: string, targets: ReadonlySet<string>): boolean {
  if (by.type === 'k') {
    const near = (s: string): number => Math.min(...[...targets].map((t) => cheb(s, t)));
    return cheb(by.square, king) <= 2 && near(by.square) < near(king);
  }
  return rookWall(by.square, king, pawn) !== null;
}

/** The line a rook walls off between a king and a pawn: its file or its rank,
 *  strictly between them; null when it is not between. */
function rookWall(rook: string, king: string, pawn: string): 'file' | 'rank' | null {
  const rf = fileOf(rook); const rr = rankOf(rook);
  if ((fileOf(king) - rf) * (fileOf(pawn) - rf) < 0) return 'file';
  if ((rankOf(king) - rr) * (rankOf(pawn) - rr) < 0) return 'rank';
  return null;
}

/** THE SHOULDER on a board: the read where a piece costs a king the most, the
 *  student's own pieces first on a tie. Null when no piece costs two moves. */
export function shoulderOn(fen: string, student: Color): ShoulderRead | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const board: Man[] = c.board().flat().filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ type: x.type, color: x.color, square: x.square }));
  if (board.some((m) => m.type !== 'k' && m.type !== 'p' && m.type !== 'r')) return null;
  const kingOf = (side: Color): Man | undefined => board.find((m) => m.type === 'k' && m.color === side);
  const reads: ShoulderRead[] = [];
  for (const pawn of board) {
    if (pawn.type !== 'p' || !isPassedPawn(board, pawn)) continue;
    const owner = pawn.color;
    const d = owner === 'w' ? 1 : -1;
    const f = fileOf(pawn.square);
    const front = new Set<string>();
    for (let r = rankOf(pawn.square) + d; r >= 1 && r <= 8; r += d) front.add(sq(f, r));
    const beside = new Set<string>(ALL.filter((s) => s !== pawn.square && Math.max(Math.abs(fileOf(s) - f), Math.abs(rankOf(s) - rankOf(pawn.square))) === 1));
    for (const mode of ['path', 'guard'] as const) {
      const wanter = mode === 'path' ? otherSide(owner) : owner;
      const king = kingOf(wanter);
      if (!king) continue;
      const targets = mode === 'path' ? front : beside;
      const blocker = otherSide(wanter);
      const steps = kingSteps(board, king, targets);
      if (steps === 0) continue;
      for (const by of board) {
        if (by.color !== blocker || (by.type !== 'k' && by.type !== 'r')) continue;
        if (!standsBetween(by, king.square, pawn.square, targets)) continue;
        const lifted = board.filter((m) => m !== by);
        const free = kingSteps(lifted, king, targets);
        if (free === null || free === 0) continue;
        if (steps !== null && steps - free < 2) continue;
        reads.push({ mode, side: blocker, by: by.type as 'k' | 'r', bySquare: by.square, king: king.square, pawn: pawn.square, steps, free,
          key: `shoulder:${mode}:${by.square}:${king.square}:${pawn.square}` });
      }
    }
  }
  if (reads.length === 0) return null;
  const cost = (r: ShoulderRead): number => (r.steps === null ? 99 : r.steps - r.free);
  return reads.sort((a, b) => cost(b) - cost(a) || (a.side === student ? 0 : 1) - (b.side === student ? 0 : 1))[0];
}

const RANK_WORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** THE SHOULDER IN WORDS, from the student's seat. */
export function shoulderLine(r: ShoulderRead, student: Color): string {
  const mine = r.side === student;
  const k = stemKeyOf(r.key);
  const By = mine ? 'Your' : 'Their';
  const kept = mine ? 'their' : 'your';
  const pawnOwner = r.mode === 'path' ? (mine ? 'your' : 'their') : (mine ? 'their' : 'your');
  const pawnName = `${pawnOwner} ${r.pawn[0]}-pawn`;
  const moves = (n: number): string => `${countWord(n)} move${n === 1 ? '' : 's'}`;
  const parts: string[] = [];
  if (r.by === 'k') {
    parts.push(rotateStem([
      `${By} king on ${r.bySquare} shoulders ${kept} king away from ${pawnName}.`,
      `${By} king on ${r.bySquare} stands in the way of ${kept} king, between it and ${pawnName}.`,
    ], k));
  } else {
    const wall = rookWall(r.bySquare, r.king, r.pawn);
    const line = wall === 'file' ? `the ${r.bySquare[0]}-file` : `the ${RANK_WORD[rankOf(r.bySquare)]} rank`;
    parts.push(rotateStem([
      `${By} rook on ${r.bySquare} cuts ${kept} king off from ${pawnName} along ${line}.`,
      `${By} rook walls off ${line}, and ${kept} king is on the wrong side of it from ${pawnName}.`,
    ], k));
  }
  const goal = r.mode === 'path' ? 'in front of the pawn' : 'beside the pawn';
  const from = `From ${r.king}`;
  const without = `without ${mine ? 'your' : 'their'} ${r.by === 'k' ? 'king' : 'rook'} there`;
  parts.push(r.steps === null
    ? `${from} it cannot get ${goal} at all as the board stands. ${openSentence(without)}, it would take ${moves(r.free)}.`
    : `${from} it needs ${moves(r.steps)} to get ${goal}. ${openSentence(without)}, it would take ${moves(r.free)}.`);
  return parts.join(' ');
}

/** The squares a read lights: the blocking piece, the king it keeps away, the pawn. */
export function shoulderSquares(r: ShoulderRead): Square[] {
  return [r.bySquare, r.king, r.pawn];
}
