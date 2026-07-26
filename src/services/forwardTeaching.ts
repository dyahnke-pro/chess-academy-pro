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

const FILES = 'abcdefgh';
const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
];

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
export function computePieceRoute(fen: string, fromSquare: Square): PieceRoute | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const piece = chess.get(fromSquare);
  if (!piece || piece.type !== 'n') return null; // knights only
  const color = piece.color;

  const MAX_HOPS = 4;
  const visited = new Set<string>([fromSquare]);
  const queue: Array<{ sq: Square; path: Square[] }> = [{ sq: fromSquare, path: [] }];
  while (queue.length > 0) {
    const head = queue.shift();
    if (!head) break;
    const { sq: cur, path } = head;
    if (path.length >= MAX_HOPS) continue;
    const cf = fileIdx(cur);
    const cr = rankIdx(cur);
    for (const [df, dr] of KNIGHT_DELTAS) {
      const next = toSquare(cf + df, cr + dr);
      if (!next || visited.has(next)) continue;
      // The knight can only travel through / land on empty squares.
      if (chess.get(next)) continue;
      visited.add(next);
      const nextPath = [...path, next];
      if (isKnightOutpost(chess, next, color)) {
        // BFS → the first outpost reached is the shortest route.
        return {
          piece: 'n',
          from: fromSquare,
          target: next,
          route: nextPath,
          why: outpostWhy(chess, next, color),
        };
      }
      queue.push({ sq: next, path: nextPath });
    }
  }
  return null;
}
