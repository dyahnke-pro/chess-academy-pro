// Piece sweep — kid captures all target pawns in fewest moves.
// Generic across all 6 pieces; reuses pieceMazeService.getPieceLegalMoves
// to compute movement (targets are "capturable" not "blocked", so the
// piece can land on them). For pawns, captures use the pawn's diagonal
// rule rather than the maze's forward-only push.

import { db } from '../db/schema';
import type { ChessPiece } from '../types';
import type { PieceSweepProgress, PieceSweepLevelProgress } from '../types/pieceSweep';
import { getPieceLegalMoves } from './pieceMazeService';

const FILES = 'abcdefgh';
function fileIndex(sq: string): number { return FILES.indexOf(sq[0]); }
function rankIndex(sq: string): number { return parseInt(sq[1], 10) - 1; }

/** For a piece sitting at `from`, the squares it can move to —
 *  obstacles block, targets are capturable (piece lands and captures).
 *  For pawns, captures only happen diagonally (forward-1 only); the
 *  maze's forward-1/2 push doesn't apply because pawns can't capture
 *  by pushing. */
export function getPieceSweepLegalMoves(
  piece: ChessPiece,
  from: string,
  obstacles: Set<string>,
  targets: Set<string>,
): string[] {
  if (piece === 'pawn') {
    // Pawns capture diagonally one square forward (white).
    const f = fileIndex(from);
    const r = rankIndex(from);
    if (r >= 7) return [];
    const moves: string[] = [];
    for (const df of [-1, 1]) {
      const cf = f + df;
      const cr = r + 1;
      if (cf < 0 || cf >= 8) continue;
      const sq = `${FILES[cf]}${cr + 1}`;
      if (obstacles.has(sq)) continue;
      if (targets.has(sq)) moves.push(sq);
    }
    // Pawn can also just push forward 1 (not a capture, but used to
    // re-position in sweep mode when no diagonal target is reachable).
    const pushOne = `${FILES[f]}${r + 2}`;
    if (!obstacles.has(pushOne) && !targets.has(pushOne)) {
      moves.push(pushOne);
    }
    return moves;
  }
  // For non-pawn pieces, blocked = obstacles only (targets are
  // capturable destinations). Sliders STOP on captures, so we have
  // to compute slides ourselves rather than reusing the maze helper
  // (which doesn't know about captures).
  // King + knight don't slide, so the maze helper works correctly
  // for them when given just obstacles (the kid can land on any
  // non-blocked adjacent / L-jump square, target or empty).
  if (piece === 'king' || piece === 'knight') {
    return getPieceLegalMoves(piece, from, obstacles)
      .filter((sq) => !obstacles.has(sq));
  }
  // Slider: rook / bishop / queen. Manually slide so we stop on
  // capture (target counts as terminal but reachable).
  const ROOK_DIRS: ReadonlyArray<[number, number]> = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const BISHOP_DIRS: ReadonlyArray<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const dirs: ReadonlyArray<[number, number]> =
    piece === 'rook' ? ROOK_DIRS
    : piece === 'bishop' ? BISHOP_DIRS
    : [...ROOK_DIRS, ...BISHOP_DIRS];
  const moves: string[] = [];
  const f0 = fileIndex(from);
  const r0 = rankIndex(from);
  for (const [df, dr] of dirs) {
    let cf = f0 + df;
    let cr = r0 + dr;
    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      const sq = `${FILES[cf]}${cr + 1}`;
      if (obstacles.has(sq)) break;
      moves.push(sq);
      if (targets.has(sq)) break; // capture stops the slide
      cf += df; cr += dr;
    }
  }
  return moves;
}

const PIECE_LETTER: Record<ChessPiece, string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P',
};

export function buildPieceSweepPieceMap(
  piece: ChessPiece,
  piecePos: string,
  remainingTargets: ReadonlyArray<string>,
  obstacles: ReadonlyArray<string>,
): Record<string, { pieceType: string }> {
  const map: Record<string, { pieceType: string }> = {};
  map[piecePos] = { pieceType: `w${PIECE_LETTER[piece]}` };
  for (const t of remainingTargets) {
    map[t] = { pieceType: 'bP' };
  }
  for (const o of obstacles) {
    // Render obstacles as black knights to visually distinguish from
    // capturable pawn targets.
    map[o] = { pieceType: 'bN' };
  }
  return map;
}

export function calculateStars(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + 2) return 2;
  return 1;
}

const PIECE_SWEEP_META_KEY = 'piece_sweep_progress_v1';

function defaultProgress(): PieceSweepProgress {
  return { levels: {} };
}

export async function getPieceSweepProgress(): Promise<PieceSweepProgress> {
  const record = await db.meta.get(PIECE_SWEEP_META_KEY);
  if (!record) return defaultProgress();
  return JSON.parse(record.value) as PieceSweepProgress;
}

export async function savePieceSweepProgress(progress: PieceSweepProgress): Promise<void> {
  await db.meta.put({ key: PIECE_SWEEP_META_KEY, value: JSON.stringify(progress) });
}

export async function completePieceSweepLevel(
  piece: ChessPiece,
  levelId: number,
  moves: number,
  par: number,
): Promise<PieceSweepLevelProgress> {
  const progress = await getPieceSweepProgress();
  const key = `${piece}:${levelId}`;
  const prior = progress.levels[key];
  const stars = calculateStars(moves, par);
  const next: PieceSweepLevelProgress = {
    completed: true,
    bestMoves: prior && prior.completed ? Math.min(prior.bestMoves, moves) : moves,
    stars: prior && prior.completed ? Math.max(prior.stars, stars) : stars,
  };
  progress.levels[key] = next;
  await savePieceSweepProgress(progress);
  return next;
}
