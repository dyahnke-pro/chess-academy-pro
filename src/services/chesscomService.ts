import { db } from '../db/schema';
import type { GameRecord, PlatformStats, TimeControlStats } from '../types';
import { detectOpening, detectBlunders } from './gameImportUtils';
import { generateMistakePuzzlesForBatch } from './mistakePuzzleService';
import { runBackgroundAnalysis } from './gameAnalysisService';

// ─── Chess.com API types ────────────────────────────────────────────────────

interface ChessComGame {
  url: string;
  pgn: string;
  time_class: string;
  end_time: number;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
}

interface ChessComResponse {
  games: ChessComGame[];
}

interface ChessComArchivesResponse {
  archives: string[];
}

interface ChessComStatsResponse {
  chess_rapid?: ChessComTimeControl;
  chess_blitz?: ChessComTimeControl;
  chess_bullet?: ChessComTimeControl;
  tactics?: { highest?: { rating: number }; lowest?: { rating: number } };
  puzzle_rush?: { best?: { score: number } };
}

interface ChessComTimeControl {
  last: { rating: number; date: number };
  best?: { rating: number; date: number };
  record: { win: number; loss: number; draw: number };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseChessComGame(game: ChessComGame): GameRecord {
  const urlParts = game.url.split('/');
  const gameId = urlParts[urlParts.length - 1];

  const result = game.white.result === 'win' ? '1-0' :
    game.black.result === 'win' ? '0-1' :
    '1/2-1/2';

  const ecoMatch = game.pgn.match(/\[ECO\s+"([^"]+)"\]/);

  return {
    id: `chesscom-${gameId}`,
    pgn: game.pgn,
    white: game.white.username,
    black: game.black.username,
    result: result as GameRecord['result'],
    date: new Date(game.end_time * 1000).toISOString().split('T')[0],
    event: `Chess.com ${game.time_class}`,
    eco: ecoMatch ? ecoMatch[1] : null,
    whiteElo: game.white.rating,
    blackElo: game.black.rating,
    source: 'chesscom',
    annotations: null,
    coachAnalysis: null,
    isMasterGame: false,
    openingId: null,
  };
}

function mapTimeControl(tc: ChessComTimeControl): TimeControlStats {
  return {
    rating: tc.last.rating,
    best: tc.best?.rating ?? tc.last.rating,
    wins: tc.record.win,
    losses: tc.record.loss,
    draws: tc.record.draw,
  };
}

// ─── Import Games ───────────────────────────────────────────────────────────

/**
 * Optional knobs passed by the auto-import scheduler so the biweekly
 * background sync doesn't race the coach for the engine.
 *
 * `skipPostProcessing` — when true, skip `generateMistakePuzzlesForBatch`
 *   and `runBackgroundAnalysis` after the import. The auto-import sets
 *   this so 556 unanalyzed games don't flood the Stockfish queue while
 *   the user is on /coach/teach waiting for the coach to play a move.
 *
 * `maxArchives` — cap on how many monthly archives to fetch
 *   (most-recent first). Defaults to all archives. The auto-import passes
 *   2 so a biweekly run covers the 14-day window without re-pulling
 *   years of history every boot.
 */
export interface ImportChessComOptions {
  skipPostProcessing?: boolean;
  maxArchives?: number;
}

/**
 * Import ALL games from a Chess.com account by fetching the archives list,
 * then downloading each monthly archive (most recent first).
 */
export async function importChessComGames(
  username: string,
  onProgress?: (count: number, status?: string) => void,
  opts: ImportChessComOptions = {},
): Promise<number> {
  // Step 1: Fetch archives list
  onProgress?.(0, 'Fetching game archives...');

  const archivesResponse = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`,
    { signal: AbortSignal.timeout(10000) },
  );

  if (!archivesResponse.ok) {
    if (archivesResponse.status === 404) {
      throw new Error(`Player "${username}" not found on Chess.com`);
    }
    throw new Error(`Chess.com API error: ${archivesResponse.status}`);
  }

  const archivesData = (await archivesResponse.json()) as ChessComArchivesResponse;
  const archives = archivesData.archives;

  if (archives.length === 0) {
    return 0;
  }

  // Step 2: Fetch each archive (most recent first for better UX).
  // The auto-import scheduler caps this via `opts.maxArchives` so we
  // only fetch the last N months instead of years of history.
  const reversedArchives = opts.maxArchives
    ? [...archives].reverse().slice(0, opts.maxArchives)
    : [...archives].reverse();
  let imported = 0;
  const importedGameIds: string[] = [];

  for (let i = 0; i < reversedArchives.length; i++) {
    const archiveUrl = reversedArchives[i];
    onProgress?.(imported, `Fetching month ${i + 1} of ${reversedArchives.length}...`);

    try {
      const response = await fetch(archiveUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) continue;

      const data = (await response.json()) as ChessComResponse;

      for (const game of data.games) {
        const record = parseChessComGame(game);

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
    } catch {
      // Skip failed archives and continue with the rest
      continue;
    }
  }

  // Generate mistake puzzles + run full background analysis. The
  // auto-import scheduler opts out of both via skipPostProcessing so
  // 556 unanalyzed games don't flood the Stockfish worker pool while
  // the student is on /coach/teach waiting for the coach to move.
  if (importedGameIds.length > 0 && !opts.skipPostProcessing) {
    void generateMistakePuzzlesForBatch(importedGameIds, username);
    runBackgroundAnalysis();
  }

  return imported;
}

// ─── Import Stats ───────────────────────────────────────────────────────────

/**
 * Fetch player stats (ratings, W/L/D, puzzle data) from Chess.com.
 */
export async function importChessComStats(
  username: string,
): Promise<PlatformStats> {
  const response = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`,
    { signal: AbortSignal.timeout(10000) },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Player "${username}" not found on Chess.com`);
    }
    throw new Error(`Chess.com stats API error: ${response.status}`);
  }

  const data = (await response.json()) as ChessComStatsResponse;

  const stats: PlatformStats = {
    platform: 'chesscom',
    username: username.toLowerCase(),
    fetchedAt: new Date().toISOString(),
  };

  if (data.chess_rapid) {
    stats.rapid = mapTimeControl(data.chess_rapid);
  }
  if (data.chess_blitz) {
    stats.blitz = mapTimeControl(data.chess_blitz);
  }
  if (data.chess_bullet) {
    stats.bullet = mapTimeControl(data.chess_bullet);
  }
  if (data.tactics?.highest) {
    stats.puzzleRating = data.tactics.highest.rating;
  }

  return stats;
}
