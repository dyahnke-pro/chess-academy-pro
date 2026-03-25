import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPuzzleActivity,
  fetchPuzzleDashboard,
  getWeakestThemesFromDashboard,
  formatThemeName,
} from './lichessPuzzleService';
import type { LichessPuzzleDashboard } from '../types';

describe('lichessPuzzleService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPuzzleActivity', () => {
    it('parses NDJSON activity response', async () => {
      const ndjson =
        JSON.stringify({ date: 1700000000000, puzzleId: 'abc', win: true }) + '\n' +
        JSON.stringify({ date: 1700000100000, puzzleId: 'def', win: false }) + '\n';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(ndjson),
      } as Response);

      const result = await fetchPuzzleActivity('tok123');
      expect(result).toHaveLength(2);
      expect(result[0].puzzleId).toBe('abc');
      expect(result[0].win).toBe(true);
      expect(result[1].win).toBe(false);
    });

    it('throws on 401 with readable message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);
      await expect(fetchPuzzleActivity('bad-token')).rejects.toThrow('Invalid Lichess token');
    });

    it('throws on other errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);
      await expect(fetchPuzzleActivity('tok')).rejects.toThrow('Puzzle activity API error: 503');
    });

    it('passes max parameter in URL', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      } as Response);
      await fetchPuzzleActivity('tok', 50);
      expect(fetchSpy.mock.calls[0][0]).toContain('max=50');
    });

    it('includes Bearer token in header', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      } as Response);
      await fetchPuzzleActivity('my-secret-token');
      const opts = fetchSpy.mock.calls[0][1] as RequestInit;
      expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer my-secret-token');
    });

    it('handles empty response body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      } as Response);
      const result = await fetchPuzzleActivity('tok');
      expect(result).toHaveLength(0);
    });
  });

  describe('fetchPuzzleDashboard', () => {
    const mockDashboard: LichessPuzzleDashboard = {
      days: 30,
      global: { firstWins: 42, replayWins: 12, nb: 60 },
      themes: {
        fork: { results: { firstWins: 8, replayWins: 2, nb: 10 } },
        pin: { results: { firstWins: 3, replayWins: 1, nb: 8 } },
      },
    };

    it('fetches and returns dashboard data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboard),
      } as Response);

      const result = await fetchPuzzleDashboard('tok', 30);
      expect(result.global.nb).toBe(60);
      expect(result.themes['fork'].results.firstWins).toBe(8);
    });

    it('includes days in URL path', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboard),
      } as Response);
      await fetchPuzzleDashboard('tok', 14);
      expect(fetchSpy.mock.calls[0][0]).toContain('/puzzle/dashboard/14');
    });

    it('throws on 401', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);
      await expect(fetchPuzzleDashboard('bad-tok')).rejects.toThrow('Invalid Lichess token');
    });
  });

  describe('getWeakestThemesFromDashboard', () => {
    const dashboard: LichessPuzzleDashboard = {
      days: 30,
      global: { firstWins: 42, replayWins: 12, nb: 60 },
      themes: {
        fork:    { results: { firstWins: 8, replayWins: 2, nb: 10 } },   // 80%
        pin:     { results: { firstWins: 2, replayWins: 1, nb: 8 } },    // 25%
        mateIn2: { results: { firstWins: 1, replayWins: 0, nb: 5 } },    // 20%
        endgame: { results: { firstWins: 6, replayWins: 2, nb: 8 } },    // 75%
      },
    };

    it('returns themes sorted by win rate ascending', () => {
      const weakest = getWeakestThemesFromDashboard(dashboard, 3);
      expect(weakest[0]).toBe('mateIn2');
      expect(weakest[1]).toBe('pin');
      expect(weakest[2]).toBe('endgame');
    });

    it('respects limit parameter', () => {
      const weakest = getWeakestThemesFromDashboard(dashboard, 2);
      expect(weakest).toHaveLength(2);
    });

    it('filters out themes with fewer than minAttempts', () => {
      const dashWithRare: LichessPuzzleDashboard = {
        ...dashboard,
        themes: {
          ...dashboard.themes,
          rare: { results: { firstWins: 0, replayWins: 0, nb: 1 } },
        },
      };
      const weakest = getWeakestThemesFromDashboard(dashWithRare, 10, 3);
      expect(weakest).not.toContain('rare');
    });

    it('returns empty array when no themes meet minAttempts', () => {
      const empty: LichessPuzzleDashboard = {
        days: 30,
        global: { firstWins: 0, replayWins: 0, nb: 0 },
        themes: { fork: { results: { firstWins: 0, replayWins: 0, nb: 1 } } },
      };
      expect(getWeakestThemesFromDashboard(empty, 5, 3)).toHaveLength(0);
    });
  });

  describe('formatThemeName', () => {
    it('formats camelCase theme names', () => {
      expect(formatThemeName('mateIn2')).toBe('Mate In 2');
      expect(formatThemeName('rookEndgame')).toBe('Rook Endgame');
      expect(formatThemeName('fork')).toBe('Fork');
      expect(formatThemeName('discoveredAttack')).toBe('Discovered Attack');
    });
  });
});
