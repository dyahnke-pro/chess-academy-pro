// forwardTeaching — teach the student to SEE AHEAD, not just react to the move
// on the board (task #31, David 2026-07-26). Every claim is COMPUTED here from
// the board (chess.js legality + classic structural definitions); the LLM only
// VOICES it (G0/G3 — no route invented by the model). Coach-tab only.
//
// computePieceRoute — a knight's multi-move JOURNEY to a supported outpost, so
// the student sees the plan behind a quiet developing move ("the knight wants
// f5 — d2, e3, then f5"). Wired into the Watch aside via engineDeltaLines
// (computeRouteDelta). See docs/plans/2026-07-26-forward-teaching.md.
//
// (The earlier explainConditionalCapture + detectDecisionPoint experiments were
// removed 2026-07-26 — detectDecisionPoint duplicated the wired forkTalk, and
// explainConditionalCapture never earned a call site. Only the route survives.)

import { Chess, type Square, type Color } from 'chess.js';
import { CAPTURE_VALUE } from './pieceValues';

const FILES = 'abcdefgh';
const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
];

const DIAG: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHO: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function toSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
  return `${FILES[file]}${rank}` as Square;
}
function fileIdx(s: Square): number { return FILES.indexOf(s[0]); }
function rankIdx(s: Square): number { return Number(s[1]); }

export interface PieceRoute {
  piece: 'n';
  /** The knight's current square. */
  from: Square;
  /** The strong square it's heading for. */
  target: Square;
  /** Squares the knight lands on in order, ending at `target` (1-4 hops). */
  route: Square[];
  /** Board-true reason the target is strong (the voice layer only rewords it). */
  why: string;
}

/** Which friendly pawn (if any) defends `square` — the outpost's backer. */
function supportingPawn(chess: Chess, square: Square, color: Color): Square | null {
  const f = fileIdx(square);
  const supRank = color === 'w' ? rankIdx(square) - 1 : rankIdx(square) + 1;
  for (const af of [f - 1, f + 1]) {
    const s = toSquare(af, supRank);
    if (!s) continue;
    const p = chess.get(s);
    if (p && p.type === 'p' && p.color === color) return s;
  }
  return null;
}

/** Is the EMPTY `square` a supported knight outpost for `color`? Classic
 *  definition: in the enemy half, defended by a friendly pawn, and a permanent
 *  HOLE — no enemy pawn on an adjacent file can ever advance to attack it.
 *  Pure board geometry, no engine. */
export function isKnightOutpost(chess: Chess, square: Square, color: Color): boolean {
  if (chess.get(square)) return false; // must be empty to travel to
  const f = fileIdx(square);
  const r = rankIdx(square);
  // Enemy half — white outposts live on ranks 4-6, black on 3-5.
  if (color === 'w' && (r < 4 || r > 6)) return false;
  if (color === 'b' && (r < 3 || r > 5)) return false;
  // Must be defended by a friendly pawn.
  if (!supportingPawn(chess, square, color)) return false;
  // Hole: no enemy pawn on an adjacent file can advance to challenge it. Enemy
  // pawns attack from one rank toward their own promotion direction, so a black
  // pawn threatens a white square from an adjacent file at rank >= r+1; a white
  // pawn threatens a black square from an adjacent file at rank <= r-1.
  const enemy: Color = color === 'w' ? 'b' : 'w';
  for (const af of [f - 1, f + 1]) {
    if (af < 0 || af > 7) continue;
    for (let rr = 1; rr <= 8; rr++) {
      const s = toSquare(af, rr);
      if (!s) continue;
      const p = chess.get(s);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      if (enemy === 'b' && rr >= r + 1) return false;
      if (enemy === 'w' && rr <= r - 1) return false;
    }
  }
  return true;
}

function outpostWhy(chess: Chess, square: Square, color: Color): string {
  const backer = supportingPawn(chess, square, color);
  const back = backer ? `, and the ${backer[0]}-pawn backs it up` : '';
  return `${square} is a strong outpost — no enemy pawn can chase the knight off${back}`;
}

/**
 * Compute a knight's shortest route from `fromSquare` to the nearest supported
 * outpost (BFS over empty-square knight hops, capped at 4). Returns null when
 * the piece isn't a knight, or no reachable supported outpost exists — the
 * common case, so the surface simply omits the route (empty > invented).
 */
/**
 * 🔒 ONE BFS, TWO CALLERS (2026-09-17). `computePieceRoute` hunts the nearest
 * OUTPOST (target unknown until found); `movesToReach` hunts a NAMED square.
 * Same walk, different stopping condition — so the condition is a predicate and
 * there is exactly one implementation to keep correct.
 *
 * Travels through EMPTY squares only: a route that needs a capture is not a
 * quiet manoeuvre, and counting it would understate the tempo cost.
 *
 * Knight-only TODAY, and the `piece.type !== 'n'` guard says so at the top
 * rather than pretending otherwise. A slider's route needs blocker handling the
 * hop table cannot express; when that lands, it lands HERE and both callers get
 * it at once.
 */
function bfsRoute(
  fen: string,
  fromSquare: Square,
  stop: (chess: Chess, sq: Square, color: Color) => boolean,
  maxHops: number,
): { chess: Chess; color: Color; target: Square; route: Square[] } | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const piece = chess.get(fromSquare);
  if (!piece || !(piece.type === 'n' || piece.type === 'b' || piece.type === 'r')) return null;
  const color = piece.color;
  // One hop = one quiet move: a knight jump, or a slide along an open ray that
  // stops before the first piece (empty squares only — see the note above).
  const hops = (from: Square): Square[] => {
    const f0 = fileIdx(from); const r0 = rankIdx(from);
    if (piece.type === 'n') {
      return KNIGHT_DELTAS.map(([df, dr]) => toSquare(f0 + df, r0 + dr)).filter((q): q is Square => !!q && !chess.get(q));
    }
    const out: Square[] = [];
    for (const [df, dr] of piece.type === 'b' ? DIAG : ORTHO) {
      for (let k = 1; k < 8; k++) {
        const q = toSquare(f0 + df * k, r0 + dr * k);
        if (!q || chess.get(q)) break;
        out.push(q);
      }
    }
    return out;
  };

  const visited = new Set<string>([fromSquare]);
  const queue: Array<{ sq: Square; path: Square[] }> = [{ sq: fromSquare, path: [] }];
  while (queue.length > 0) {
    const head = queue.shift();
    if (!head) break;
    const { sq: cur, path } = head;
    if (path.length >= maxHops) continue;
    for (const next of hops(cur)) {
      if (visited.has(next)) continue;
      visited.add(next);
      const nextPath = [...path, next];
      if (stop(chess, next, color)) {
        // BFS → the first square that satisfies the predicate is the shortest route.
        return { chess, color, target: next, route: nextPath };
      }
      queue.push({ sq: next, path: nextPath });
    }
  }
  return null;
}

/**
 * How many quiet moves this piece needs to REACH `target`, or null when it
 * cannot inside `maxHops`. The tempo count the latent-fork detector needs: a
 * fork two moves away is a different teaching moment from one four moves away.
 */
export function movesToReach(
  fen: string,
  fromSquare: Square,
  target: Square,
  maxHops = 4,
): number | null {
  if (fromSquare === target) return 0;
  const found = bfsRoute(fen, fromSquare, (_c, sq) => sq === target, maxHops);
  return found ? found.route.length : null;
}

export function computePieceRoute(fen: string, fromSquare: Square): PieceRoute | null {
  try { if (new Chess(fen).get(fromSquare)?.type !== 'n') return null; } catch { return null; }
  const found = bfsRoute(fen, fromSquare, (c, sq, color) => isKnightOutpost(c, sq, color), 4);
  if (!found) return null;
  return {
    piece: 'n',
    from: fromSquare,
    target: found.target,
    route: found.route,
    why: outpostWhy(found.chess, found.target, found.color),
  };
}

/** Squares a bishop or rook on `sq` sweeps (empty squares plus the first piece
 *  it meets), the board as it stands. */
function sliderScope(c: Chess, sq: Square, type: 'b' | 'r'): number {
  let n = 0;
  for (const [df, dr] of type === 'b' ? DIAG : ORTHO) {
    for (let k = 1; k < 8; k++) {
      const q = toSquare(fileIdx(sq) + df * k, rankIdx(sq) + dr * k);
      if (!q) break;
      n++;
      if (c.get(q)) break;
    }
  }
  return n;
}

/** A square the piece can stand on: no enemy pawn hits it, and no enemy piece
 *  worth less than it does either. */
function safeFor(c: Chess, sq: Square, color: Color, value: number): boolean {
  const enemy: Color = color === 'w' ? 'b' : 'w';
  return !c.attackers(sq, enemy).some((a) => CAPTURE_VALUE[c.get(a)?.type ?? 'k'] < value);
}

export interface SliderRoute {
  piece: 'b' | 'r';
  from: Square;
  target: Square;
  route: Square[];
  why: string;
}

/**
 * Census #15, the wishlist: where does a passive bishop or rook WANT to be, and
 * how does it get there (at most two quiet moves)? A bishop wants a safe square
 * that sweeps at least three more squares than it does now (and seven or more);
 * a rook wants a safe square on a file with no pawn of its own. Null when no
 * such square is two quiet moves away — silence, not a guess.
 */
export function computeSliderRoute(fen: string, fromSquare: Square): SliderRoute | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const p = c.get(fromSquare);
  if (!p || (p.type !== 'b' && p.type !== 'r')) return null;
  const type = p.type;
  const color = p.color;
  const value = type === 'b' ? 3 : 5;
  const now = sliderScope(c, fromSquare, type);
  // A bishop is passive only when it sweeps four squares or fewer.
  if (type === 'b' && now > 4) return null;
  const ownPawnOn = (file: string): boolean => {
    for (let r = 1; r <= 8; r++) { const q = c.get(`${file}${r}` as Square); if (q?.type === 'p' && q.color === color) return true; }
    return false;
  };
  const found = bfsRoute(fen, fromSquare, (board, sq) => {
    if (!safeFor(board, sq, color, value)) return false;
    // Measure from the target with the piece moved there.
    const moved = new Chess(board.fen());
    moved.remove(fromSquare);
    moved.put({ type, color }, sq);
    if (type === 'b') {
      const scope = sliderScope(moved, sq, 'b');
      return scope >= 7 && scope >= now + 3;
    }
    return sq[0] !== fromSquare[0] && !ownPawnOn(sq[0]);
  }, 2);
  if (!found) return null;
  // Every stop on the way must be safe too, not only the destination.
  if (!found.route.every((sq) => safeFor(c, sq, color, value))) return null;
  const why = type === 'b'
    ? `a long diagonal instead of ${now} squares`
    : `the ${found.target[0]}-file, with no pawn of yours in the way`;
  return { piece: type, from: fromSquare, target: found.target, route: found.route, why };
}
