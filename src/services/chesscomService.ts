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
 * Import ALL games from a Chess.com account by fetching the archives list,
 * then downloading each monthly archive (most recent first).
 */
export async function importChessComGames(
  username: string,
  onProgress?: (count: number, status?: string) => void,
): Promise<number> {
  // Step 1: Fetch archives list
  onProgress?.(0, 'Fetching game archives...');

  const archivesResponse = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`,
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

  // Step 2: Fetch each archive (most recent first for better UX)
  const reversedArchives = [...archives].reverse();
  let imported = 0;
  const importedGameIds: string[] = [];

  for (let i = 0; i < reversedArchives.length; i++) {
    const archiveUrl = reversedArchives[i];
    onProgress?.(imported, `Fetching month ${i + 1} of ${reversedArchives.length}...`);

    try {
      const response = await fetch(archiveUrl);
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

  // Generate mistake puzzles and run Stockfish analysis in background
  if (importedGameIds.length > 0) {
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
