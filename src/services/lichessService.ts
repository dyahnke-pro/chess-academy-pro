import { db } from '../db/schema';
import type { GameRecord } from '../types';
import { detectOpening, detectBlunders } from './gameImportUtils';

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

export async function importLichessGames(
  username: string,
  onProgress?: (count: number) => void,
): Promise<number> {
  const response = await fetch(
    `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=20&pgnInJson=true`,
    {
      headers: { Accept: 'application/x-ndjson' },
    },
  );

  if (!response.ok) {
    throw new Error(`Lichess API error: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n').filter((l) => l.trim());
  let imported = 0;

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
