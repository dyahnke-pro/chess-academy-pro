import { db } from '../db/schema';
import type { GameRecord, PlatformStats } from '../types';
import { detectOpening, detectBlunders } from './gameImportUtils';
import { generateMistakePuzzlesForBatch } from './mistakePuzzleService';
import { runBackgroundAnalysis } from './gameAnalysisService';

// ─── Lichess API types ──────────────────────────────────────────────────────

interface LichessGame {
  id: string;
  players: {
    white: { user?: { name: string }; rating?: number };
    black: { user?: { name: string }; rating?: number };
  };
  winner?: string;
  opening?: { eco: string; name: string };
  createdAt: number;
  pgn?: string;
}

interface LichessUserResponse {
  username: string;
  perfs: {
    rapid?: LichessPerf;
    blitz?: LichessPerf;
    bullet?: LichessPerf;
    puzzle?: LichessPerf;
    classical?: LichessPerf;
  };
}

interface LichessPerf {
  games: number;
  rating: number;
  rd: number;
  prog: number;
}

// ─── Import Games ───────────────────────────────────────────────────────────

const MAX_LICHESS_GAMES = 200;

/**
 * Auto-import scheduler opts. `skipPostProcessing` skips the
 * `generateMistakePuzzlesForBatch` + `runBackgroundAnalysis` chain so
 * the biweekly background sync doesn't queue hundreds of games into
 * Stockfish while the student is on /coach/teach.
 */
export interface ImportLichessOptions {
  skipPostProcessing?: boolean;
}

/**
 * Import recent games from a Lichess account.
 * Fetches up to 200 games (vs the old limit of 20).
 */
export async function importLichessGames(
  username: string,
  onProgress?: (count: number, status?: string) => void,
  opts: ImportLichessOptions = {},
): Promise<number> {
  onProgress?.(0, 'Fetching games from Lichess...');

  const response = await fetch(
    `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${MAX_LICHESS_GAMES}&pgnInJson=true`,
    {
      headers: { Accept: 'application/x-ndjson' },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Player "${username}" not found on Lichess`);
    }
    throw new Error(`Lichess API error: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n').filter((l) => l.trim());
  let imported = 0;
  const importedGameIds: string[] = [];

  onProgress?.(0, `Processing ${lines.length} games...`);

  for (const line of lines) {
    const game = JSON.parse(line) as LichessGame;

    const result = game.winner === 'white' ? '1-0' :
      game.winner === 'black' ? '0-1' :
      game.winner ? '1-0' : '1/2-1/2';

    const record: GameRecord = {
      id: `lichess-${game.id}`,
      pgn: game.pgn ?? '',
      white: game.players.white.user?.name ?? 'Anonymous',
      black: game.players.black.user?.name ?? 'Anonymous',
      result: result as GameRecord['result'],
      date: new Date(game.createdAt).toISOString().split('T')[0],
      event: 'Lichess',
      eco: game.opening?.eco ?? null,
      whiteElo: game.players.white.rating ?? null,
      blackElo: game.players.black.rating ?? null,
      source: 'lichess',
      annotations: null,
      coachAnalysis: null,
      isMasterGame: false,
      openingId: null,
    };

    // Dedupe by ID
    const existing = await db.games.get(record.id);
    if (!existing) {
      if (record.pgn) {
        record.openingId = await detectOpening(record.pgn);
      }
      if (record.pgn) {
        record.annotations = detectBlunders(record.pgn);
      }

      await db.games.put(record);
      importedGameIds.push(record.id);
      imported++;
      onProgress?.(imported);
    }
  }

  // Generate mistake puzzles + run full background analysis. The
  // auto-import scheduler opts out via skipPostProcessing so the
  // engine stays free for the coach's stockfish_eval calls.
  if (importedGameIds.length > 0 && !opts.skipPostProcessing) {
    void generateMistakePuzzlesForBatch(importedGameIds, username);
    runBackgroundAnalysis();
  }

  return imported;
}

// ─── Import Stats ───────────────────────────────────────────────────────────

/**
 * Fetch player stats (ratings, game counts) from Lichess.
 */
export async function importLichessStats(
  username: string,
): Promise<PlatformStats> {
  const response = await fetch(
    `https://lichess.org/api/user/${encodeURIComponent(username)}`,
    {
      headers: { Accept: 'application/json' },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Player "${username}" not found on Lichess`);
    }
    throw new Error(`Lichess API error: ${response.status}`);
  }

  const data = (await response.json()) as LichessUserResponse;

  const stats: PlatformStats = {
    platform: 'lichess',
    username: data.username,
    fetchedAt: new Date().toISOString(),
  };

  if (data.perfs.rapid && data.perfs.rapid.games > 0) {
    stats.rapid = {
      rating: data.perfs.rapid.rating,
      best: data.perfs.rapid.rating,
      wins: 0, losses: 0, draws: 0, // Lichess doesn't give per-perf W/L/D in this endpoint
    };
  }
  if (data.perfs.blitz && data.perfs.blitz.games > 0) {
    stats.blitz = {
      rating: data.perfs.blitz.rating,
      best: data.perfs.blitz.rating,
      wins: 0, losses: 0, draws: 0,
    };
  }
  if (data.perfs.bullet && data.perfs.bullet.games > 0) {
    stats.bullet = {
      rating: data.perfs.bullet.rating,
      best: data.perfs.bullet.rating,
      wins: 0, losses: 0, draws: 0,
    };
  }
  if (data.perfs.puzzle && data.perfs.puzzle.games > 0) {
    stats.puzzleRating = data.perfs.puzzle.rating;
  }

  return stats;
}

// ─── Puzzle Stream ───────────────────────────────────────────────────────────

export interface LichessStreamPuzzle {
  id: string;
  rating: number;
  themes: string[];
  solution: string[];
  pgn: string;
  initialPly: number;
  white: string;
  black: string;
}

interface LichessNextPuzzleResponse {
  game: {
    id: string;
    pgn: string;
    players: Array<{
      userId: string;
      name: string;
      color: 'white' | 'black';
      rating: number;
    }>;
  };
  puzzle: {
    id: string;
    rating: number;
    plays: number;
    solution: string[];
    themes: string[];
    initialPly: number;
  };
}

/**
 * Fetch the next Lichess puzzle (optionally filtered by theme or rating).
 * No auth required — uses the public `/api/puzzle/next` endpoint.
 */
export async function fetchNextLichessPuzzle(options?: {
  theme?: string;
  difficulty?: 'easiest' | 'easier' | 'normal' | 'harder' | 'hardest';
}): Promise<LichessStreamPuzzle> {
  const params = new URLSearchParams();
  if (options?.theme) params.set('angle', options.theme);
  if (options?.difficulty) params.set('difficulty', options.difficulty);

  const url = `https://lichess.org/api/puzzle/next${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Lichess puzzle stream error: ${response.status}`);
  }

  const data = (await response.json()) as LichessNextPuzzleResponse;

  const white = data.game.players.find((p) => p.color === 'white')?.name ?? 'White';
  const black = data.game.players.find((p) => p.color === 'black')?.name ?? 'Black';

  return {
    id: data.puzzle.id,
    rating: data.puzzle.rating,
    themes: data.puzzle.themes,
    solution: data.puzzle.solution,
    pgn: data.game.pgn,
    initialPly: data.puzzle.initialPly,
    white,
    black,
  };
}
