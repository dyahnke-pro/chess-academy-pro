import { db } from '../db/schema';
import type { GameRecord } from '../types';
import { detectOpening, detectBlunders } from './gameImportUtils';

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

export async function importChessComGames(
  username: string,
  onProgress?: (count: number) => void,
): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const response = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/${year}/${month}`,
  );

  if (!response.ok) {
    throw new Error(`Chess.com API error: ${response.status}`);
  }

  const data = (await response.json()) as ChessComResponse;
  let imported = 0;

  for (const game of data.games) {
    const urlParts = game.url.split('/');
    const gameId = urlParts[urlParts.length - 1];

    const result = game.white.result === 'win' ? '1-0' :
      game.black.result === 'win' ? '0-1' :
      '1/2-1/2';

    // Extract ECO from PGN headers
    const ecoMatch = game.pgn.match(/\[ECO\s+"([^"]+)"\]/);

    const record: GameRecord = {
      id: `chesscom-${gameId}`,
      pgn: game.pgn,
      white: game.white.username,
      black: game.black.username,
      result: result as GameRecord['result'],
      date: new Date(game.end_time * 1000).toISOString().split('T')[0],
      event: 'Chess.com',
      eco: ecoMatch ? ecoMatch[1] : null,
      whiteElo: game.white.rating,
      blackElo: game.black.rating,
      source: 'chesscom',
      annotations: null,
      coachAnalysis: null,
      isMasterGame: false,
      openingId: null,
    };

    const existing = await db.games.get(record.id);
    if (!existing) {
      // Opening detection
      if (record.pgn) {
        record.openingId = await detectOpening(record.pgn);
      }

      // Blunder detection from eval annotations
      if (record.pgn) {
        record.annotations = detectBlunders(record.pgn);
      }

      await db.games.put(record);
      imported++;
      onProgress?.(imported);
    }
  }

  return imported;
}
