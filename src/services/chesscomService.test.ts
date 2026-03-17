import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { importChessComGames, importChessComStats } from './chesscomService';

vi.mock('./mistakePuzzleService', () => ({
  generateMistakePuzzlesForBatch: vi.fn().mockResolvedValue(0),
}));

const MOCK_GAMES = [
  {
    url: 'https://www.chess.com/game/live/12345',
    pgn: '[Event "Live"]\n[ECO "B20"]\n1. e4 c5',
    time_class: 'rapid',
    end_time: Math.floor(Date.now() / 1000),
    white: { username: 'Alice', rating: 1500, result: 'win' },
    black: { username: 'Bob', rating: 1400, result: 'checkmated' },
  },
];

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

/**
 * Helper to mock fetch for the archives-based flow.
 * First call returns archives list, subsequent calls return monthly game data.
 */
function mockArchivesFlow(
  archives: string[],
  monthlyGames: Record<string, Record<string, unknown>[]>,
): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : (input as URL).href;

    // Archives endpoint
    if (url.includes('/games/archives')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ archives }),
      } as Response);
    }

    // Monthly endpoint
    for (const [archiveUrl, games] of Object.entries(monthlyGames)) {
      if (url === archiveUrl) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ games }),
        } as Response);
      }
    }

    // Default: empty month
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ games: [] }),
    } as Response);
  });
}

describe('chesscomService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.restoreAllMocks();
  });

  describe('importChessComGames', () => {
    it('imports games across multiple monthly archives', async () => {
      const archives = [
        'https://api.chess.com/pub/player/testuser/games/2024/01',
        'https://api.chess.com/pub/player/testuser/games/2024/02',
      ];

      mockArchivesFlow(archives, {
        [archives[0]]: [makeChessComGame({ url: 'https://www.chess.com/game/live/jan1' })],
        [archives[1]]: [makeChessComGame({ url: 'https://www.chess.com/game/live/feb1' })],
      });

      const count = await importChessComGames('testuser');
      expect(count).toBe(2);

      const games = await db.games.toArray();
      expect(games).toHaveLength(2);
      expect(games.every((g) => g.source === 'chesscom')).toBe(true);
    });

    it('imports from a single archive with multiple games', async () => {
      const archive = 'https://api.chess.com/pub/player/testuser/games/2024/03';
      mockArchivesFlow([archive], {
        [archive]: MOCK_GAMES,
      });

      const count = await importChessComGames('testuser');
      expect(count).toBe(1);

      const games = await db.games.toArray();
      expect(games).toHaveLength(1);
      expect(games[0].source).toBe('chesscom');
      expect(games[0].eco).toBe('B20');
    });

    it('deduplicates by ID', async () => {
      const archive = 'https://api.chess.com/pub/player/testuser/games/2024/03';
      mockArchivesFlow([archive], {
        [archive]: MOCK_GAMES,
      });

      await importChessComGames('testuser');
      const count2 = await importChessComGames('testuser');
      expect(count2).toBe(0);
    });

    it('throws for 404 user not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(importChessComGames('baduser')).rejects.toThrow('not found');
    });

    it('returns 0 when archives list is empty', async () => {
      mockArchivesFlow([], {});

      const count = await importChessComGames('emptyuser');
      expect(count).toBe(0);
    });

    it('correctly maps white win, black win, and draw results', async () => {
      const archive = 'https://api.chess.com/pub/player/testuser/games/2024/01';
      mockArchivesFlow([archive], {
        [archive]: [
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
      });

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
      const archive = 'https://api.chess.com/pub/player/testuser/games/2024/01';
      mockArchivesFlow([archive], {
        [archive]: [makeChessComGame({ url: 'https://www.chess.com/game/live/98765' })],
      });

      await importChessComGames('user');
      const game = await db.games.get('chesscom-98765');
      expect(game).toBeDefined();
      expect(game?.id).toBe('chesscom-98765');
    });

    it('includes time class in event name', async () => {
      const archive = 'https://api.chess.com/pub/player/testuser/games/2024/01';
      mockArchivesFlow([archive], {
        [archive]: [makeChessComGame({ url: 'https://www.chess.com/game/live/tc1', time_class: 'blitz' })],
      });

      await importChessComGames('user');
      const game = await db.games.get('chesscom-tc1');
      expect(game?.event).toBe('Chess.com blitz');
    });

    it('skips failed archive fetches and continues', async () => {
      const archives = [
        'https://api.chess.com/pub/player/testuser/games/2024/01',
        'https://api.chess.com/pub/player/testuser/games/2024/02',
      ];

      vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : (input as URL).href;

        if (url.includes('/games/archives')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ archives }) } as Response);
        }

        // First archive fails
        if (url === archives[0]) {
          return Promise.resolve({ ok: false, status: 500 } as Response);
        }

        // Second archive works
        if (url === archives[1]) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              games: [makeChessComGame({ url: 'https://www.chess.com/game/live/feb1' })],
            }),
          } as Response);
        }

        return Promise.resolve({ ok: true, json: () => Promise.resolve({ games: [] }) } as Response);
      });

      const count = await importChessComGames('testuser');
      expect(count).toBe(1);
    });

    it('calls onProgress with count and status', async () => {
      const archive = 'https://api.chess.com/pub/player/testuser/games/2024/01';
      mockArchivesFlow([archive], {
        [archive]: [
          makeChessComGame({ url: 'https://www.chess.com/game/live/p1' }),
          makeChessComGame({ url: 'https://www.chess.com/game/live/p2' }),
        ],
      });

      const onProgress = vi.fn();
      await importChessComGames('testuser', onProgress);

      // Should be called with status messages and game counts
      expect(onProgress).toHaveBeenCalled();
      const countCalls = onProgress.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'number' && c[0] > 0,
      );
      expect(countCalls.length).toBeGreaterThanOrEqual(2);
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

  describe('importChessComStats', () => {
    it('fetches and returns player stats', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chess_rapid: {
            last: { rating: 1500, date: 1700000000 },
            best: { rating: 1600, date: 1690000000 },
            record: { win: 100, loss: 80, draw: 20 },
          },
          chess_blitz: {
            last: { rating: 1400, date: 1700000000 },
            record: { win: 200, loss: 180, draw: 40 },
          },
          tactics: { highest: { rating: 1800 } },
        }),
      } as Response);

      const stats = await importChessComStats('testuser');
      expect(stats.platform).toBe('chesscom');
      expect(stats.rapid?.rating).toBe(1500);
      expect(stats.rapid?.best).toBe(1600);
      expect(stats.rapid?.wins).toBe(100);
      expect(stats.blitz?.rating).toBe(1400);
      expect(stats.puzzleRating).toBe(1800);
    });

    it('handles missing time controls gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const stats = await importChessComStats('testuser');
      expect(stats.rapid).toBeUndefined();
      expect(stats.blitz).toBeUndefined();
      expect(stats.bullet).toBeUndefined();
      expect(stats.puzzleRating).toBeUndefined();
    });

    it('throws for 404 user not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(importChessComStats('baduser')).rejects.toThrow('not found');
    });
  });
});
