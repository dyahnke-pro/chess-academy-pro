import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { importLichessGames, importLichessStats } from './lichessService';

const MOCK_NDJSON = [
  JSON.stringify({
    id: 'abc123',
    players: {
      white: { user: { name: 'Alice' }, rating: 1500 },
      black: { user: { name: 'Bob' }, rating: 1400 },
    },
    winner: 'white',
    opening: { eco: 'B20', name: 'Sicilian' },
    createdAt: Date.now(),
    pgn: '1. e4 c5',
  }),
  JSON.stringify({
    id: 'def456',
    players: {
      white: { user: { name: 'Charlie' }, rating: 1600 },
      black: { user: { name: 'Dave' }, rating: 1550 },
    },
    opening: { eco: 'C50', name: 'Italian' },
    createdAt: Date.now(),
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
  }),
].join('\n');

function makeLichessGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `game_${Math.random().toString(36).slice(2, 8)}`,
    players: {
      white: { user: { name: 'Player1' }, rating: 1500 },
      black: { user: { name: 'Player2' }, rating: 1400 },
    },
    winner: 'white',
    opening: { eco: 'B20', name: 'Sicilian' },
    createdAt: Date.now(),
    pgn: '1. e4 c5',
    ...overrides,
  };
}

describe('lichessService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.restoreAllMocks();
  });

  describe('importLichessGames', () => {
    it('imports games from Lichess NDJSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_NDJSON),
      } as Response);

      const count = await importLichessGames('testuser');
      expect(count).toBe(2);

      const games = await db.games.toArray();
      expect(games).toHaveLength(2);
      expect(games[0].source).toBe('lichess');
    });

    it('deduplicates by ID', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_NDJSON),
      } as Response);

      await importLichessGames('testuser');
      const count2 = await importLichessGames('testuser');
      expect(count2).toBe(0);
    });

    it('throws on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(importLichessGames('baduser')).rejects.toThrow('not found');
    });

    it('calls onProgress callback', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_NDJSON),
      } as Response);

      const onProgress = vi.fn();
      await importLichessGames('testuser', onProgress);
      // Called with status messages and game counts
      expect(onProgress).toHaveBeenCalledWith(0, expect.stringContaining('Fetching'));
      // Game-level progress (count only, no status)
      const countCalls = onProgress.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'number' && c[0] > 0,
      );
      expect(countCalls).toHaveLength(2);
    });

    it('parses five games from NDJSON', async () => {
      const games = Array.from({ length: 5 }, (_, i) =>
        makeLichessGame({ id: `multi_${i}` }),
      );
      const ndjson = games.map((g) => JSON.stringify(g)).join('\n');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      const count = await importLichessGames('multiuser');
      expect(count).toBe(5);

      const stored = await db.games.toArray();
      expect(stored).toHaveLength(5);
      expect(stored.map((g) => g.id)).toEqual(
        expect.arrayContaining(games.map((g) => `lichess-${g.id as string}`)),
      );
    });

    it('handles trailing newline in NDJSON without error', async () => {
      const ndjson = JSON.stringify(makeLichessGame({ id: 'trailing' })) + '\n\n';

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      const count = await importLichessGames('trailinguser');
      expect(count).toBe(1);
    });

    it('throws when a line is not valid JSON', async () => {
      const ndjson = [
        JSON.stringify(makeLichessGame({ id: 'good1' })),
        'this is not valid json',
        JSON.stringify(makeLichessGame({ id: 'good2' })),
      ].join('\n');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await expect(importLichessGames('malformed')).rejects.toThrow();
    });

    it('throws when fetch rejects (network error)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));

      await expect(importLichessGames('offline')).rejects.toThrow('Network request failed');
    });

    it('throws on 429 rate-limit response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 429,
      } as Response);

      await expect(importLichessGames('ratelimited')).rejects.toThrow('Lichess API error: 429');
    });

    it('maps white winner to result 1-0', async () => {
      const ndjson = JSON.stringify(makeLichessGame({ id: 'w1', winner: 'white' }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await importLichessGames('user');
      const game = await db.games.get('lichess-w1');
      expect(game?.result).toBe('1-0');
    });

    it('maps black winner to result 0-1', async () => {
      const ndjson = JSON.stringify(makeLichessGame({ id: 'b1', winner: 'black' }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await importLichessGames('user');
      const game = await db.games.get('lichess-b1');
      expect(game?.result).toBe('0-1');
    });

    it('maps no winner to draw (1/2-1/2)', async () => {
      const ndjson = JSON.stringify(makeLichessGame({ id: 'draw1', winner: undefined }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await importLichessGames('user');
      const game = await db.games.get('lichess-draw1');
      expect(game?.result).toBe('1/2-1/2');
    });

    it('correctly maps player names and ratings', async () => {
      const ndjson = JSON.stringify(makeLichessGame({
        id: 'fields1',
        players: {
          white: { user: { name: 'Magnus' }, rating: 2800 },
          black: { user: { name: 'Hikaru' }, rating: 2750 },
        },
      }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await importLichessGames('user');
      const game = await db.games.get('lichess-fields1');
      expect(game?.white).toBe('Magnus');
      expect(game?.black).toBe('Hikaru');
      expect(game?.whiteElo).toBe(2800);
      expect(game?.blackElo).toBe(2750);
    });

    it('uses Anonymous for missing user names', async () => {
      const ndjson = JSON.stringify(makeLichessGame({
        id: 'anon1',
        players: {
          white: { rating: 1200 },
          black: { rating: 1100 },
        },
      }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await importLichessGames('user');
      const game = await db.games.get('lichess-anon1');
      expect(game?.white).toBe('Anonymous');
      expect(game?.black).toBe('Anonymous');
    });

    it('sets source to lichess and event to Lichess', async () => {
      const ndjson = JSON.stringify(makeLichessGame({ id: 'src1' }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await importLichessGames('user');
      const game = await db.games.get('lichess-src1');
      expect(game?.source).toBe('lichess');
      expect(game?.event).toBe('Lichess');
    });

    it('prefixes game ID with lichess-', async () => {
      const ndjson = JSON.stringify(makeLichessGame({ id: 'xyz789' }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      await importLichessGames('user');
      const game = await db.games.get('lichess-xyz789');
      expect(game).toBeDefined();
      expect(game?.id).toBe('lichess-xyz789');
    });
  });

  describe('importLichessStats', () => {
    it('fetches and returns player stats', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          username: 'testplayer',
          perfs: {
            rapid: { games: 100, rating: 1500, rd: 50, prog: 10 },
            blitz: { games: 200, rating: 1400, rd: 40, prog: -5 },
            puzzle: { games: 500, rating: 1800, rd: 30, prog: 20 },
          },
        }),
      } as Response);

      const stats = await importLichessStats('testplayer');
      expect(stats.platform).toBe('lichess');
      expect(stats.rapid?.rating).toBe(1500);
      expect(stats.blitz?.rating).toBe(1400);
      expect(stats.puzzleRating).toBe(1800);
    });

    it('skips time controls with zero games', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          username: 'newplayer',
          perfs: {
            rapid: { games: 0, rating: 1500, rd: 350, prog: 0 },
            blitz: { games: 5, rating: 1200, rd: 200, prog: 0 },
          },
        }),
      } as Response);

      const stats = await importLichessStats('newplayer');
      expect(stats.rapid).toBeUndefined();
      expect(stats.blitz?.rating).toBe(1200);
    });

    it('throws for 404 user not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(importLichessStats('baduser')).rejects.toThrow('not found');
    });
  });
});
