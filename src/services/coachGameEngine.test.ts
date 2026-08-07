import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock stockfishEngine before importing
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(),
    getBestMove: vi.fn(),
    forceRestart: vi.fn(),
    initialize: vi.fn(),
    stop: vi.fn(),
  },
}));

import { getAdaptiveMove, getTargetStrength, tryOpeningBookMove, breakBookProbability } from './coachGameEngine';
import { stockfishEngine } from './stockfishEngine';
import type { StockfishAnalysis } from '../types';

const analyzePositionMock = vi.mocked(stockfishEngine).analyzePosition;
const getBestMoveMock = vi.mocked(stockfishEngine).getBestMove;

const mockAnalysis: StockfishAnalysis = {
  bestMove: 'e2e4',
  evaluation: 30,
  isMate: false,
  mateIn: null,
  depth: 12,
  topLines: [
    { rank: 1, evaluation: 30, moves: ['e2e4', 'e7e5'], mate: null },
    { rank: 2, evaluation: 20, moves: ['d2d4', 'd7d5'], mate: null },
    { rank: 3, evaluation: 10, moves: ['c2c4', 'e7e5'], mate: null },
  ],
  nodesPerSecond: 1000000,
};

describe('coachGameEngine', () => {
  beforeEach(() => {
    analyzePositionMock.mockResolvedValue(mockAnalysis);
    getBestMoveMock.mockResolvedValue('e2e4');
    // Default to the threaded (desktop) path so the depth-by-ELO assertions
    // below test the full curve. The single-threaded depth cap is covered by
    // its own test.
    vi.stubGlobal('crossOriginIsolated', true);
  });

  describe('getAdaptiveMove — movetime-first (David 2026-08-07: depth-14 selection took 5-6s per reply)', () => {
    it('returns the movetime search result as the move', async () => {
      const result = await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1200);
      expect(result.move).toBe('e2e4');
      expect(result.source).toBe('stockfish-best');
      expect(analyzePositionMock).not.toHaveBeenCalled(); // depth search never runs when the timed search delivers
    });

    it('uses the bounded THREADED movetime with the rating-matched skill', async () => {
      await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1200);
      expect(getBestMoveMock).toHaveBeenCalledWith(expect.any(String), 1200, 11);
    });

    it('uses the longer single-threaded movetime when not cross-origin isolated', async () => {
      vi.stubGlobal('crossOriginIsolated', false);
      await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1500);
      expect(getBestMoveMock).toHaveBeenCalledWith(expect.any(String), 2500, 14);
    });
  });

  describe('getAdaptiveMove — depth-search recovery ladder (movetime search failed)', () => {
    beforeEach(() => {
      // The timed search must FAIL for the depth ladder to run at all.
      getBestMoveMock.mockResolvedValue('(none)');
    });

    it('returns a move and analysis from the depth search', async () => {
      const result = await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1200);
      expect(result.move).toBeTruthy();
      expect(result.analysis).toBe(mockAnalysis);
    });

    it('always returns the best move or 2nd-best move', async () => {
      for (let i = 0; i < 20; i++) {
        const result = await getAdaptiveMove('startfen', 1000);
        expect(['e2e4', 'd2d4']).toContain(result.move);
      }
    });

    it('uses depth 10 for < 1000 ELO', async () => {
      await getAdaptiveMove('startfen', 900);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 10, { 'Skill Level': 5 });
    });

    it('uses depth 12 for 1000-1199 ELO', async () => {
      await getAdaptiveMove('startfen', 1100);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 12, { 'Skill Level': 8 });
    });

    it('uses depth 14 for 1200-1499 ELO', async () => {
      await getAdaptiveMove('startfen', 1300);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 14, expect.any(Object));
    });

    it('uses depth 16 for 1500-1799 ELO', async () => {
      await getAdaptiveMove('startfen', 1600);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 16, expect.any(Object));
    });

    it('uses depth 18 for 1800+ ELO', async () => {
      await getAdaptiveMove('startfen', 2000);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 18, expect.any(Object));
    });

    it('caps depth at 10 on single-threaded (no cross-origin isolation)', async () => {
      // iOS / no-SharedArrayBuffer path: a deep search blows the move-timeout
      // budget and falls back to random, so the depth is capped (David 2026-06-21).
      vi.stubGlobal('crossOriginIsolated', false);
      await getAdaptiveMove('startfen', 1600); // depth 16 on threaded
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 10, expect.any(Object));
    });

    it('uses skill 2 for < 800 ELO', async () => {
      await getAdaptiveMove('startfen', 700);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), expect.any(Number), { 'Skill Level': 2 });
    });

    it('uses skill 20 for 2000+ ELO', async () => {
      await getAdaptiveMove('startfen', 2100);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), expect.any(Number), { 'Skill Level': 20 });
    });
  });

  describe('getTargetStrength', () => {
    it('returns player rating for medium (matches strength)', () => {
      expect(getTargetStrength(1420)).toBe(1420);
    });

    it('floors at 600', () => {
      expect(getTargetStrength(500)).toBe(600);
    });

    it('returns player rating + 200 for hard', () => {
      expect(getTargetStrength(1400, 'hard')).toBe(1600);
    });

    it('returns player rating - 300 for easy', () => {
      expect(getTargetStrength(1400, 'easy')).toBe(1100);
    });

    it('returns 600 for low easy rating (at the floor)', () => {
      expect(getTargetStrength(800, 'easy')).toBe(600);
    });
  });

  describe('breakBookProbability (opening book-break by rating)', () => {
    it('strong players (>=1600) never break book', () => {
      expect(breakBookProbability(1600)).toBe(0);
      expect(breakBookProbability(2000)).toBe(0);
    });

    it('beginners break book most of the time', () => {
      expect(breakBookProbability(800)).toBeGreaterThanOrEqual(0.6);
    });

    it('monotonically decreases as rating rises', () => {
      const p = [700, 1000, 1200, 1400, 1550, 1600].map(breakBookProbability);
      for (let i = 1; i < p.length; i += 1) expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
    });

    it('lower-intermediates still break book sometimes, strong-intermediates rarely', () => {
      expect(breakBookProbability(1250)).toBeGreaterThan(0.2);
      expect(breakBookProbability(1550)).toBeGreaterThan(0);
      expect(breakBookProbability(1550)).toBeLessThan(0.2);
    });
  });

  describe('tryOpeningBookMove', () => {
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

    it('returns the next book move when on the opening line', () => {
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['e4'], frenchMoves, 'black');
      expect(result).toBe('e7e6');
    });

    it('returns null when no opening is requested', () => {
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['e4'], null, 'black');
      expect(result).toBeNull();
    });

    it('returns null when game has deviated from book', () => {
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['d4'], frenchMoves, 'black');
      expect(result).toBeNull();
    });

    it('returns null when it is not the AI turn', () => {
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(START_FEN, [], frenchMoves, 'black');
      expect(result).toBeNull();
    });

    it('returns null when past the end of book moves', () => {
      const frenchMoves = ['e4', 'e6'];
      const afterE4E6Fen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const result = tryOpeningBookMove(afterE4E6Fen, ['e4', 'e6'], frenchMoves, 'white');
      expect(result).toBeNull();
    });

    it('returns the correct move for AI playing white', () => {
      const italianMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
      const result = tryOpeningBookMove(START_FEN, [], italianMoves, 'white');
      expect(result).toBe('e2e4');
    });
  });
});

// David 2026-08-02, playing a Vienna on his iPhone: EIGHT coach moves, EIGHT
// `analyzePosition failed/timeout after 8000ms`, every one landing on the
// fallback — which called getBestMove WITHOUT a skill argument, so it defaulted
// to 20. A 1684-rated opponent played full-strength Stockfish for the whole
// game and beat him by seven pawns.
describe('getAdaptiveMove — the single-threaded (iOS) opponent', () => {
  beforeEach(() => {
    analyzePositionMock.mockClear();
    getBestMoveMock.mockClear();
    vi.stubGlobal('crossOriginIsolated', false);
    vi.stubGlobal('SharedArrayBuffer', undefined);
  });

  it('searches by TIME, not depth, so it cannot time out every move', async () => {
    const result = await getAdaptiveMove('r3k2r/pp2bppp/2n5/3pP3/2pP2Q1/5N2/P1P1B1PP/q3BK1R b kq - 1 15', 1684);
    expect(getBestMoveMock).toHaveBeenCalled();
    expect(analyzePositionMock).not.toHaveBeenCalled();
    expect(result.move).toBe('e2e4');
  });

  it('plays at the rating-matched skill level, never full strength', async () => {
    await getAdaptiveMove('r3k2r/pp2bppp/2n5/3pP3/2pP2Q1/5N2/P1P1B1PP/q3BK1R b kq - 1 15', 1684);
    const skillArgs = getBestMoveMock.mock.calls.map((c) => c[2]);
    expect(skillArgs.length).toBeGreaterThan(0);
    for (const skill of skillArgs) {
      expect(skill).toBe(16); // getSkillLevelForElo(1684)
      expect(skill).not.toBe(20);
    }
  });

  it('a weaker opponent gets a weaker skill level', async () => {
    await getAdaptiveMove('r3k2r/pp2bppp/2n5/3pP3/2pP2Q1/5N2/P1P1B1PP/q3BK1R b kq - 1 15', 900);
    expect(getBestMoveMock.mock.calls.some((c) => c[2] === 5)).toBe(true);
  });
});
