import { db } from '../db/schema';
import type { RookGameProgress } from '../types/rookGames';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROOK_GAME_META_KEY = 'rook_game_progress';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// ─── Square Helpers ──────────────────────────────────────────────────────────

function fileIndex(square: string): number {
  return square.charCodeAt(0) - 97;
}

function rankIndex(square: string): number {
  return parseInt(square[1], 10) - 1;
}

function toSquare(file: number, rank: number): string {
  return `${FILES[file]}${String(RANKS[rank])}`;
}

// ─── FEN Builder ─────────────────────────────────────────────────────────────

/**
 * Build a FEN string from a piece map.
 * Pieces use FEN notation: 'R' = white rook, 'p' = black pawn, etc.
 */
export function buildFen(pieces: Record<string, string>): string {
  const ranks: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let empty = 0;
    let rankStr = '';
    for (let file = 0; file < 8; file++) {
      const sq = toSquare(file, rank);
      const piece = pieces[sq];
      if (piece) {
        if (empty > 0) {
          rankStr += String(empty);
          empty = 0;
        }
        rankStr += piece;
      } else {
        empty++;
      }
    }
    if (empty > 0) rankStr += String(empty);
    ranks.push(rankStr);
  }
  return `${ranks.join('/')} w - - 0 1`;
}

// ─── Rook Movement Logic ─────────────────────────────────────────────────────

/**
 * Calculate all squares a rook on `from` can reach, given a set of blocked squares.
 * The rook moves horizontally and vertically but cannot jump over blocked squares.
 * If `capturable` is provided, the rook can move TO those squares (capture) but not through them.
 */
export function getRookLegalMoves(
  from: string,
  blocked: Set<string>,
  capturable?: Set<string>,
): string[] {
  const moves: string[] = [];
  const f = fileIndex(from);
  const r = rankIndex(from);
  const capturableSet = capturable ?? new Set<string>();

  // Four directions: up, down, left, right
  const directions: [number, number][] = [
    [0, 1],   // up (rank+)
    [0, -1],  // down (rank-)
    [1, 0],   // right (file+)
    [-1, 0],  // left (file-)
  ];

  for (const [df, dr] of directions) {
    let cf = f + df;
    let cr = r + dr;
    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      const sq = toSquare(cf, cr);
      if (blocked.has(sq)) break;
      if (capturableSet.has(sq)) {
        moves.push(sq);
        break; // Rook stops on capture
      }
      moves.push(sq);
      cf += df;
      cr += dr;
    }
  }

  return moves;
}

/**
 * Build the piece map for a Rook Maze position.
 */
export function buildMazePieceMap(
  rookPos: string,
  obstacles: string[],
): Record<string, string> {
  const pieces: Record<string, string> = {};
  pieces[rookPos] = 'R';
  for (const obs of obstacles) {
    pieces[obs] = 'p';
  }
  return pieces;
}

/**
 * Build the piece map for a Row Clearer position.
 */
export function buildClearerPieceMap(
  rooks: string[],
  enemies: string[],
): Record<string, string> {
  const pieces: Record<string, string> = {};
  for (const rook of rooks) {
    pieces[rook] = 'R';
  }
  for (const enemy of enemies) {
    pieces[enemy] = 'p';
  }
  return pieces;
}

/**
 * Check if the rook at `from` is on the same file or rank as any target square.
 * Used for "Efficient!" feedback in Row Clearer.
 */
export function isAlignedWithAny(from: string, targets: string[]): boolean {
  const f = fileIndex(from);
  const r = rankIndex(from);
  return targets.some((t) => fileIndex(t) === f || rankIndex(t) === r);
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

/**
 * Calculate stars earned based on moves used vs par.
 * 3 stars: moves ≤ par
 * 2 stars: moves ≤ par + 2
 * 1 star: completed (any moves)
 */
export function calculateStars(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + 2) return 2;
  return 1;
}

// ─── Progress Persistence ────────────────────────────────────────────────────

function defaultProgress(): RookGameProgress {
  return { rookMaze: {}, rowClearer: {} };
}

export async function getRookGameProgress(): Promise<RookGameProgress> {
  const record = await db.meta.get(ROOK_GAME_META_KEY);
  if (!record) return defaultProgress();
  return JSON.parse(record.value) as RookGameProgress;
}

export async function saveRookGameProgress(progress: RookGameProgress): Promise<void> {
  await db.meta.put({ key: ROOK_GAME_META_KEY, value: JSON.stringify(progress) });
}

export async function completeMazeLevel(
  levelId: number,
  moves: number,
  par: number,
): Promise<RookGameProgress> {
  const progress = await getRookGameProgress();
  const stars = calculateStars(moves, par);
  const existing = levelId in progress.rookMaze ? progress.rookMaze[levelId] : undefined;

  if (!existing || moves < existing.bestMoves) {
    progress.rookMaze[levelId] = {
      completed: true,
      bestMoves: moves,
      stars: Math.max(stars, existing ? existing.stars : 0),
    };
  } else if (stars > existing.stars) {
    progress.rookMaze[levelId] = { ...existing, stars };
  }

  await saveRookGameProgress(progress);
  return progress;
}

export async function completeClearerLevel(
  levelId: number,
  moves: number,
  par: number,
): Promise<RookGameProgress> {
  const progress = await getRookGameProgress();
  const stars = calculateStars(moves, par);
  const existing = levelId in progress.rowClearer ? progress.rowClearer[levelId] : undefined;

  if (!existing || moves < existing.bestMoves) {
    progress.rowClearer[levelId] = {
      completed: true,
      bestMoves: moves,
      stars: Math.max(stars, existing ? existing.stars : 0),
    };
  } else if (stars > existing.stars) {
    progress.rowClearer[levelId] = { ...existing, stars };
  }

  await saveRookGameProgress(progress);
  return progress;
}

/**
 * Check if the pawn chapter is completed in Pawn's Journey (unlock condition for rook games).
 */
export async function isPawnChapterCompleted(): Promise<boolean> {
  const record = await db.meta.get('journey_progress');
  if (!record) return false;
  const progress = JSON.parse(record.value) as {
    chapters: Partial<Record<string, { completed?: boolean }>>;
  };
  const pawn = progress.chapters.pawn;
  return pawn?.completed === true;
}
