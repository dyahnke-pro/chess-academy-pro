// forwardTeaching — teach the student to SEE AHEAD, not just react to the move
// on the board (task #31, David 2026-07-26). Every claim is COMPUTED here from
// the board (chess.js legality + classic structural definitions); the LLM only
// VOICES it (G0/G3 — no route invented by the model). Coach-tab only.
//
// Phase 1: computePieceRoute — a knight's multi-move JOURNEY to a supported
// outpost, so the student sees the plan behind a quiet developing move
// ("the knight wants f5 — d2, e3, then f5"). See
// docs/plans/2026-07-26-forward-teaching.md.

import { Chess, type Square, type Color } from 'chess.js';
import { describeStructure } from './boardStructure';

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

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
  if (!piece || piece.type !== 'n') return null; // Phase 1: knights only
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

// ── Phase 2: conditional captures — "if you take, then …" ──────────────────

export interface ConditionalCapture {
  /** The played line: [captureSan] or [captureSan, best recaptureSan]. */
  line: string[];
  /** Present-tense board-true consequence of the trade (opens a file, hands a
   *  passer, saddles them with a weakness — with an HONEST downside when the
   *  capture also damages the mover's own structure). */
  consequence: string;
}

/**
 * Explain the STRUCTURAL consequence of a capture BEFORE the student commits to
 * it — the forward "if you take on d5, the recapture opens the e-file" teaching.
 * Plays the capture + the opponent's best recapture (least-valuable attacker),
 * then diffs the pawn structure before vs after. Pure chess.js + boardStructure
 * (no engine); returns null when the move isn't a capture or has no structural
 * story worth teaching (empty > invented).
 */
export function explainConditionalCapture(fen: string, captureSan: string): ConditionalCapture | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover = chess.turn();
  let cap;
  try {
    cap = chess.move(captureSan);
  } catch {
    return null;
  }
  if (!cap || !cap.captured) return null; // must be an actual capture
  const target = cap.to;
  const line: string[] = [cap.san];

  // The opponent recaptures on the target with their LEAST-valuable attacker
  // (the standard practical recapture) — pure heuristic, no engine.
  const recaptures = chess
    .moves({ verbose: true })
    .filter((m) => m.to === target && m.captured);
  if (recaptures.length > 0) {
    recaptures.sort((a, b) => PIECE_VALUE[a.piece] - PIECE_VALUE[b.piece]);
    const rc = chess.move(recaptures[0].san);
    if (rc) line.push(rc.san);
  }

  const before = describeStructure(fen);
  const after = describeStructure(chess.fen());
  if (!before || !after) return null;

  const enemy: Color = mover === 'w' ? 'b' : 'w';
  const gained = (a: string[], b: string[]): string[] => a.filter((x) => !b.includes(x));

  const openFiles = gained(after.pawns.openFiles, before.pawns.openFiles);
  const halfOpen = gained(after.pawns.halfOpenFiles[mover], before.pawns.halfOpenFiles[mover]);
  const passers = gained(after.pawns.passedPawns[mover], before.pawns.passedPawns[mover]);
  const enemyDoubled = gained(after.pawns.doubledFiles[enemy], before.pawns.doubledFiles[enemy]);
  const enemyIsolated = gained(after.pawns.isolatedPawns[enemy], before.pawns.isolatedPawns[enemy]);
  const ownDoubled = gained(after.pawns.doubledFiles[mover], before.pawns.doubledFiles[mover]);
  const ownIsolated = gained(after.pawns.isolatedPawns[mover], before.pawns.isolatedPawns[mover]);

  let lead = '';
  if (passers.length) lead = `it hands you a passed pawn on ${passers[0]}`;
  else if (openFiles.length) lead = `it rips open the ${openFiles[0]}-file`;
  else if (halfOpen.length) lead = `it opens the ${halfOpen[0]}-file for your rooks`;
  else if (enemyDoubled.length) lead = `it saddles them with doubled pawns on the ${enemyDoubled[0]}-file`;
  else if (enemyIsolated.length) lead = `it leaves them an isolated pawn on ${enemyIsolated[0]}`;

  let downside = '';
  if (ownDoubled.length) downside = `but it doubles your own pawns on the ${ownDoubled[0]}-file`;
  else if (ownIsolated.length) downside = `but it leaves your ${ownIsolated[0]}-pawn isolated`;

  if (!lead && !downside) return null; // no structural story to tell
  const body = [lead, downside].filter(Boolean).join(' — ');
  return { line, consequence: `${body.charAt(0).toUpperCase()}${body.slice(1)}.` };
}
