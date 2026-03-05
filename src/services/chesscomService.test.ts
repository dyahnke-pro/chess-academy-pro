import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { importChessComGames } from './chesscomService';

const MOCK_RESPONSE = {
  games: [
    {
      url: 'https://www.chess.com/game/live/12345',
      pgn: '[Event "Live"]\n[ECO "B20"]\n1. e4 c5',
      time_class: 'rapid',
      end_time: Math.floor(Date.now() / 1000),
      white: { username: 'Alice', rating: 1500, result: 'win' },
      black: { username: 'Bob', rating: 1400, result: 'checkmated' },
    },
  ],
};

function makeChessComGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: `https://www.chess.com/game/live/${Math.random().toString(36).slice(2, 8)}`,
    pgn: '[Event "Live"]\n[ECO "C50"]\n1. e4 e5 2. Nf3 Nc6 3. Bc4',
    time_class: 'rapid',
    end_time: Math.floor(Date.now() / 1000),
    white: { username: 'Alice', rating: 1500, result: 'win' },
    black: { username: 'Bob', rating: 1400, result: 'checkmated' },
    ...overrides,
  };
}

describe('chesscomService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.restoreAllMocks();
  });

  it('imports games from Chess.com', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE),
    } as Response);

    const count = await importChessComGames('testuser');
    expect(count).toBe(1);

    const games = await db.games.toArray();
    expect(games).toHaveLength(1);
    expect(games[0].source).toBe('chesscom');
    expect(games[0].eco).toBe('B20');
  });

  it('deduplicates by ID', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE),
    } as Response);

    await importChessComGames('testuser');
    const count2 = await importChessComGames('testuser');
    expect(count2).toBe(0);
  });

  it('throws on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(importChessComGames('baduser')).rejects.toThrow('404');
  });

  describe('games array parsing', () => {
    it('parses multiple games from the response', async () => {
      const multiResponse = {
        games: [
          makeChessComGame({ url: 'https://www.chess.com/game/live/111' }),
          makeChessComGame({ url: 'https://www.chess.com/game/live/222' }),
          makeChessComGame({ url: 'https://www.chess.com/game/live/333' }),
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(multiResponse),
      } as Response);

      const count = await importChessComGames('multiuser');
      expect(count).toBe(3);

      const stored = await db.games.toArray();
      expect(stored).toHaveLength(3);
      expect(stored.every((g) => g.source === 'chesscom')).toBe(true);
    });

    it('correctly maps white win, black win, and draw results', async () => {
      const multiResponse = {
        games: [
          makeChessComGame({
            url: 'https://www.chess.com/game/live/w1',
            white: { username: 'A', rating: 1500, result: 'win' },
            black: { username: 'B', rating: 1400, result: 'checkmated' },
          }),
          makeChessComGame({
            url: 'https://www.chess.com/game/live/b1',
            white: { username: 'A', rating: 1500, result: 'checkmated' },
            black: { username: 'B', rating: 1400, result: 'win' },
          }),
          makeChessComGame({
            url: 'https://www.chess.com/game/live/d1',
            white: { username: 'A', rating: 1500, result: 'stalemate' },
            black: { username: 'B', rating: 1400, result: 'stalemate' },
          }),
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(multiResponse),
      } as Response);

      await importChessComGames('resultsuser');
      const games = await db.games.toArray();

      const whiteWin = games.find((g) => g.id === 'chesscom-w1');
      const blackWin = games.find((g) => g.id === 'chesscom-b1');
      const draw = games.find((g) => g.id === 'chesscom-d1');

      expect(whiteWin?.result).toBe('1-0');
      expect(blackWin?.result).toBe('0-1');
      expect(draw?.result).toBe('1/2-1/2');
    });

    it('extracts game ID from the URL path', async () => {
      const response = {
        games: [
          makeChessComGame({ url: 'https://www.chess.com/game/live/98765' }),
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);

      await importChessComGames('user');
      const game = await db.games.get('chesscom-98765');
      expect(game).toBeDefined();
      expect(game?.id).toBe('chesscom-98765');
    });
  });

  describe('empty months handling', () => {
    it('returns 0 imported for empty games array', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ games: [] }),
      } as Response);

      const count = await importChessComGames('emptyuser');
      expect(count).toBe(0);

      const stored = await db.games.toArray();
      expect(stored).toHaveLength(0);
    });
  });

  describe('404 user not found', () => {
    it('throws with status 404 for unknown username', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(importChessComGames('nonexistent_user_xyz')).rejects.toThrow(
        'Chess.com API error: 404',
      );
    });

    it('does not store any games when user is not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      try {
        await importChessComGames('ghost');
      } catch {
        // expected
      }

      const stored = await db.games.toArray();
      expect(stored).toHaveLength(0);
    });
  });
});
