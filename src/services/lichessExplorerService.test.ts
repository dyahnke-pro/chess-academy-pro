import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchLichessExplorer,
  fetchCloudEval,
  formatCloudEval,
  _resetLichessCircuitBreaker,
} from './lichessExplorerService';

describe('lichessExplorerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetLichessCircuitBreaker();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _resetLichessCircuitBreaker();
  });

  describe('fetchLichessExplorer', () => {
    it('fetches Lichess explorer data for a FEN', async () => {
      const mockResult = {
        white: 4200,
        draws: 1800,
        black: 4000,
        moves: [
          { uci: 'e2e4', san: 'e4', averageRating: 1850, white: 2100, draws: 900, black: 2000, game: null },
        ],
        topGames: [],
        opening: { eco: 'A00', name: 'Starting Position' },
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      } as Response);

      const result = await fetchLichessExplorer('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result.moves).toHaveLength(1);
      expect(result.moves[0].san).toBe('e4');
      expect(result.white).toBe(4200);
    });

    it('fetches masters explorer data when source is masters', async () => {
      const mockResult = {
        white: 800, draws: 600, black: 600,
        moves: [{ uci: 'e2e4', san: 'e4', averageRating: 2650, white: 400, draws: 300, black: 300, game: null }],
        topGames: [],
        opening: null,
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      } as Response);

      await fetchLichessExplorer('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'masters');
      // WO-REAL-FIXES — fetches now go through our Edge proxy at
      // `/api/lichess-explorer?source=masters&...` instead of the
      // bare `explorer.lichess.ovh` host. The proxy talks to Lichess
      // server-side where User-Agent isn't a forbidden header.
      expect(fetchSpy.mock.calls[0][0]).toContain('/api/lichess-explorer');
      expect(fetchSpy.mock.calls[0][0]).toContain('source=masters');
    });

    it('throws on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);
      await expect(fetchLichessExplorer('bad fen')).rejects.toThrow('Explorer API error: 500');
    });

    it('includes speeds and ratings params for lichess source', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null }),
      } as Response);
      await fetchLichessExplorer('fen here', 'lichess');
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('speeds=');
      expect(url).toContain('ratings=');
    });
  });

  describe('circuit breaker', () => {
    it('opens after 3 consecutive failures and short-circuits the next call', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('nginx 401'),
      } as Response);
      for (let i = 0; i < 3; i += 1) {
        await expect(fetchLichessExplorer('fen')).rejects.toThrow('Explorer API error: 401');
      }
      await expect(fetchLichessExplorer('fen')).rejects.toThrow('lichess-explorer-circuit-open');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('auto-resets after CIRCUIT_RESET_AFTER_MS so a transient outage does not block the rest of the session', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-05-02T12:00:00Z'));
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('nginx 401'),
        } as Response);
        for (let i = 0; i < 3; i += 1) {
          await expect(fetchLichessExplorer('fen')).rejects.toThrow('Explorer API error: 401');
        }
        await expect(fetchLichessExplorer('fen')).rejects.toThrow('lichess-explorer-circuit-open');
        expect(fetchSpy).toHaveBeenCalledTimes(3);

        vi.setSystemTime(new Date('2026-05-02T12:02:01Z'));
        fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null }),
        } as Response);
        const result = await fetchLichessExplorer('fen');
        expect(result.moves).toEqual([]);
        expect(fetchSpy).toHaveBeenCalledTimes(4);
      } finally {
        vi.useRealTimers();
      }
    });

    it('resets immediately on a successful fetch', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve('nginx 401'),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve('nginx 401'),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve('nginx 401'),
        } as Response);

      await expect(fetchLichessExplorer('fen')).rejects.toThrow('Explorer API error: 401');
      await expect(fetchLichessExplorer('fen')).rejects.toThrow('Explorer API error: 401');
      const ok = await fetchLichessExplorer('fen');
      expect(ok.moves).toEqual([]);
      await expect(fetchLichessExplorer('fen')).rejects.toThrow('Explorer API error: 401');
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('fetchCloudEval', () => {
    it('fetches cloud eval for a position', async () => {
      const mockEval = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        knodes: 2547,
        depth: 40,
        pvs: [{ moves: 'e2e4', cp: 28 }],
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEval),
      } as Response);

      const result = await fetchCloudEval('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result).not.toBeNull();
      expect(result?.depth).toBe(40);
      expect(result?.pvs[0].cp).toBe(28);
    });

    it('returns null on 404 (no cloud eval for position)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);
      const result = await fetchCloudEval('obscure fen');
      expect(result).toBeNull();
    });

    it('throws on other non-ok responses', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
      } as Response);
      await expect(fetchCloudEval('fen')).rejects.toThrow('Cloud eval API error: 429');
    });

    it('passes multiPv parameter', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ fen: '', knodes: 0, depth: 0, pvs: [] }),
      } as Response);
      await fetchCloudEval('fen', 5);
      expect(fetchSpy.mock.calls[0][0]).toContain('multiPv=5');
    });
  });

  describe('formatCloudEval', () => {
    it('formats positive centipawns', () => {
      expect(formatCloudEval({ cp: 45 })).toBe('+0.45');
    });

    it('formats negative centipawns', () => {
      expect(formatCloudEval({ cp: -123 })).toBe('-1.23');
    });

    it('formats mate in positive', () => {
      expect(formatCloudEval({ mate: 3 })).toBe('M3');
    });

    it('formats mate in negative', () => {
      expect(formatCloudEval({ mate: -2 })).toBe('-M2');
    });

    it('returns 0.00 when no values', () => {
      expect(formatCloudEval({})).toBe('0.00');
    });
  });
});
