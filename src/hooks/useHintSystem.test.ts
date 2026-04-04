import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHintSystem } from './useHintSystem';
import type { UseHintSystemConfig } from './useHintSystem';

// Mock stockfish engine
vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 16,
      topLines: [
        { rank: 1, evaluation: 30, moves: ['e2e4', 'e7e5'], mate: null },
        { rank: 2, evaluation: 20, moves: ['d2d4', 'd7d5'], mate: null },
        { rank: 3, evaluation: 15, moves: ['g1f3', 'd7d5'], mate: null },
      ],
      nodesPerSecond: 1000000,
    }),
    stop: vi.fn(),
  },
}));

// Mock socratic nudge service
vi.mock('../services/socraticNudgeService', () => ({
  generateSocraticNudge: vi.fn().mockReturnValue('Think about controlling the center.'),
}));

const DEFAULT_CONFIG: UseHintSystemConfig = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  playerColor: 'white',
  enabled: true,
};

describe('useHintSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with level 0 and empty state', () => {
    const { result } = renderHook(() => useHintSystem(DEFAULT_CONFIG));
    expect(result.current.hintState.level).toBe(0);
    expect(result.current.hintState.arrows).toEqual([]);
    expect(result.current.hintState.nudgeText).toBeNull();
    expect(result.current.hintState.ghostMove).toBeNull();
    expect(result.current.hintState.isAnalyzing).toBe(false);
    expect(result.current.hintState.hintsUsed).toBe(0);
  });

  describe('with knownMove', () => {
    const configWithKnown: UseHintSystemConfig = {
      ...DEFAULT_CONFIG,
      knownMove: { from: 'e2', to: 'e4', san: 'e4' },
    };

    it('level 0→1: shows single gold arrow for known move', () => {
      const { result } = renderHook(() => useHintSystem(configWithKnown));
      act(() => result.current.requestHint());

      expect(result.current.hintState.level).toBe(1);
      expect(result.current.hintState.arrows).toHaveLength(1);
      expect(result.current.hintState.arrows[0].startSquare).toBe('e2');
      expect(result.current.hintState.arrows[0].endSquare).toBe('e4');
      expect(result.current.hintState.arrows[0].color).toContain('255, 215, 0');
    });

    it('level 1→2: generates nudge text', () => {
      const { result } = renderHook(() => useHintSystem(configWithKnown));
      act(() => result.current.requestHint()); // → level 1
      act(() => result.current.requestHint()); // → level 2

      expect(result.current.hintState.level).toBe(2);
      expect(result.current.hintState.nudgeText).toBeTruthy();
      // Arrows from level 1 persist
      expect(result.current.hintState.arrows).toHaveLength(1);
    });

    it('level 2→3: generates ghost move', () => {
      const { result } = renderHook(() => useHintSystem(configWithKnown));
      act(() => result.current.requestHint()); // → 1
      act(() => result.current.requestHint()); // → 2
      act(() => result.current.requestHint()); // → 3

      expect(result.current.hintState.level).toBe(3);
      expect(result.current.hintState.ghostMove).not.toBeNull();
      expect(result.current.hintState.ghostMove?.fromSquare).toBe('e2');
      expect(result.current.hintState.ghostMove?.toSquare).toBe('e4');
      expect(result.current.hintState.ghostMove?.piece).toBe('wP');
      // Arrows and nudge persist
      expect(result.current.hintState.arrows).toHaveLength(1);
      expect(result.current.hintState.nudgeText).toBeTruthy();
    });

    it('does not advance beyond level 3', () => {
      const { result } = renderHook(() => useHintSystem(configWithKnown));
      act(() => result.current.requestHint()); // → 1
      act(() => result.current.requestHint()); // → 2
      act(() => result.current.requestHint()); // → 3
      act(() => result.current.requestHint()); // → still 3

      expect(result.current.hintState.level).toBe(3);
      expect(result.current.hintState.hintsUsed).toBe(3);
    });

    it('increments hintsUsed for each level', () => {
      const { result } = renderHook(() => useHintSystem(configWithKnown));
      expect(result.current.hintState.hintsUsed).toBe(0);

      act(() => result.current.requestHint());
      expect(result.current.hintState.hintsUsed).toBe(1);

      act(() => result.current.requestHint());
      expect(result.current.hintState.hintsUsed).toBe(2);

      act(() => result.current.requestHint());
      expect(result.current.hintState.hintsUsed).toBe(3);
    });
  });

  describe('without knownMove (Stockfish mode)', () => {
    it('level 0→1: triggers Stockfish analysis and sets isAnalyzing', async () => {
      const { stockfishEngine } = await import('../services/stockfishEngine');
      const { result } = renderHook(() => useHintSystem(DEFAULT_CONFIG));

      // Trigger hint request (fires async Stockfish analysis)
      act(() => {
        result.current.requestHint();
      });

      // Should be analyzing immediately
      expect(result.current.hintState.isAnalyzing).toBe(true);

      // Wait for the async analysis to resolve
      await waitFor(() => {
        expect(result.current.hintState.level).toBe(1);
      });

      expect(stockfishEngine.initialize).toHaveBeenCalled();
      expect(stockfishEngine.analyzePosition).toHaveBeenCalledWith(
        DEFAULT_CONFIG.fen,
        16,
      );
      expect(result.current.hintState.arrows).toHaveLength(3);
      expect(result.current.hintState.isAnalyzing).toBe(false);
    });

    it('builds 3 arrows with correct colors from analysis', async () => {
      const { result } = renderHook(() => useHintSystem(DEFAULT_CONFIG));

      act(() => {
        result.current.requestHint();
      });

      await waitFor(() => {
        expect(result.current.hintState.level).toBe(1);
      });

      const arrows = result.current.hintState.arrows;
      expect(arrows[0].color).toContain('255, 215, 0'); // gold
      expect(arrows[1].color).toContain('148, 163, 184'); // slate
      expect(arrows[2].color).toContain('148, 163, 184'); // slate
      // Best move arrow
      expect(arrows[0].startSquare).toBe('e2');
      expect(arrows[0].endSquare).toBe('e4');
    });
  });

  describe('resetHints', () => {
    it('resets to level 0 but preserves hintsUsed', () => {
      const config: UseHintSystemConfig = {
        ...DEFAULT_CONFIG,
        knownMove: { from: 'e2', to: 'e4', san: 'e4' },
      };
      const { result } = renderHook(() => useHintSystem(config));

      act(() => result.current.requestHint()); // → 1
      act(() => result.current.requestHint()); // → 2
      expect(result.current.hintState.hintsUsed).toBe(2);

      act(() => result.current.resetHints());

      expect(result.current.hintState.level).toBe(0);
      expect(result.current.hintState.arrows).toEqual([]);
      expect(result.current.hintState.nudgeText).toBeNull();
      expect(result.current.hintState.ghostMove).toBeNull();
      expect(result.current.hintState.hintsUsed).toBe(2); // preserved
    });
  });

  describe('FEN change', () => {
    it('resets hint state when FEN changes', () => {
      const config: UseHintSystemConfig = {
        ...DEFAULT_CONFIG,
        knownMove: { from: 'e2', to: 'e4', san: 'e4' },
      };
      const { result, rerender } = renderHook(
        (props: UseHintSystemConfig) => useHintSystem(props),
        { initialProps: config },
      );

      act(() => result.current.requestHint()); // → 1
      expect(result.current.hintState.level).toBe(1);

      // Change FEN
      rerender({
        ...config,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      });

      expect(result.current.hintState.level).toBe(0);
      expect(result.current.hintState.arrows).toEqual([]);
      expect(result.current.hintState.hintsUsed).toBe(1); // preserved
    });
  });

  describe('disabled state', () => {
    it('requestHint is a no-op when disabled', () => {
      const config: UseHintSystemConfig = {
        ...DEFAULT_CONFIG,
        enabled: false,
        knownMove: { from: 'e2', to: 'e4', san: 'e4' },
      };
      const { result } = renderHook(() => useHintSystem(config));

      act(() => result.current.requestHint());
      expect(result.current.hintState.level).toBe(0);
    });
  });

  describe('ghost move data', () => {
    it('generates correct ghost for a capture move', () => {
      // Position where Nf3 can capture on e5
      const config: UseHintSystemConfig = {
        ...DEFAULT_CONFIG,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
        knownMove: { from: 'f3', to: 'e5', san: 'Nxe5' },
      };
      const { result } = renderHook(() => useHintSystem(config));

      act(() => result.current.requestHint()); // → 1
      act(() => result.current.requestHint()); // → 2
      act(() => result.current.requestHint()); // → 3

      const ghost = result.current.hintState.ghostMove;
      expect(ghost).not.toBeNull();
      expect(ghost?.fromSquare).toBe('f3');
      expect(ghost?.toSquare).toBe('e5');
      expect(ghost?.piece).toBe('wN');
      expect(ghost?.capturedSquare).toBe('e5');
    });

    it('generates ghost with null capturedSquare for non-capture', () => {
      const config: UseHintSystemConfig = {
        ...DEFAULT_CONFIG,
        knownMove: { from: 'e2', to: 'e4', san: 'e4' },
      };
      const { result } = renderHook(() => useHintSystem(config));

      act(() => result.current.requestHint()); // → 1
      act(() => result.current.requestHint()); // → 2
      act(() => result.current.requestHint()); // → 3

      expect(result.current.hintState.ghostMove?.capturedSquare).toBeNull();
    });
  });

  describe('puzzle themes', () => {
    it('passes puzzleThemes to nudge generator', async () => {
      const { generateSocraticNudge } = await import('../services/socraticNudgeService');
      const mockedNudge = vi.mocked(generateSocraticNudge);

      const config: UseHintSystemConfig = {
        ...DEFAULT_CONFIG,
        knownMove: { from: 'e2', to: 'e4', san: 'e4' },
        puzzleThemes: ['fork', 'middlegame'],
      };
      const { result } = renderHook(() => useHintSystem(config));

      act(() => result.current.requestHint()); // → 1
      act(() => result.current.requestHint()); // → 2

      expect(mockedNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          puzzleThemes: ['fork', 'middlegame'],
        }),
      );
    });
  });
});
