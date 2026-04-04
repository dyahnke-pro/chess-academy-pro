import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCoachTips } from './useCoachTips';
import type { UseCoachTipsConfig } from './useCoachTips';
import type { CoachGameMove, StockfishAnalysis } from '../types';

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(),
  },
}));

vi.mock('../services/tacticAlertService', () => ({
  detectGameplayTactic: (): null => null,
  scanUpcomingTactic: (): null => null,
  buildTacticAlertMessage: (): string => '',
  getTacticLookahead: (): number => 2,
  isTacticWeakness: (): Promise<boolean> => Promise.resolve(false),
  recordTacticOutcome: (): void => {},
}));

import { stockfishEngine } from '../services/stockfishEngine';

const mockAnalyze = vi.mocked(stockfishEngine.analyzePosition);

function buildMove(overrides: Partial<CoachGameMove> = {}): CoachGameMove {
  return {
    moveNumber: 1,
    san: 'e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    isCoachMove: false,
    commentary: '',
    evaluation: 0,
    classification: 'good',
    expanded: false,
    bestMove: null,
    bestMoveEval: null,
    preMoveEval: null,
    ...overrides,
  };
}

function buildAnalysis(overrides: Partial<StockfishAnalysis> = {}): StockfishAnalysis {
  return {
    bestMove: 'e2e4',
    evaluation: 30,
    isMate: false,
    mateIn: null,
    depth: 10,
    topLines: [
      { rank: 1, moves: ['e2e4'], evaluation: 30, mate: null },
      { rank: 2, moves: ['d2d4'], evaluation: 20, mate: null },
    ],
    nodesPerSecond: 1000000,
    ...overrides,
  };
}

function defaultConfig(overrides: Partial<UseCoachTipsConfig> = {}): UseCoachTipsConfig {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    playerColor: 'white',
    isPlayerTurn: true,
    enabled: true,
    moves: [buildMove(), buildMove({ moveNumber: 2, isCoachMove: true }), buildMove({ moveNumber: 3 })],
    playerRating: 1200,
    onTip: vi.fn(),
    ...overrides,
  };
}

describe('useCoachTips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('does not analyze when disabled', () => {
    renderHook(() => useCoachTips(defaultConfig({ enabled: false })));
    vi.advanceTimersByTime(2000);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('does not analyze when not player turn', () => {
    renderHook(() => useCoachTips(defaultConfig({ isPlayerTurn: false })));
    vi.advanceTimersByTime(2000);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('does not analyze with fewer than 2 moves', () => {
    renderHook(() => useCoachTips(defaultConfig({ moves: [buildMove()] })));
    vi.advanceTimersByTime(2000);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('fires a positional tip when tactic service finds no tactic', async () => {
    vi.useRealTimers();
    const onTip = vi.fn();
    const analysis = buildAnalysis({
      topLines: [
        { rank: 1, moves: ['e2e4'], evaluation: 300, mate: null },
        { rank: 2, moves: ['d2d4'], evaluation: 50, mate: null },
      ],
    });
    mockAnalyze.mockResolvedValue(analysis);

    // When detectGameplayTactic returns null (mocked), the hook falls through
    // to positional tips — this verifies the fallback chain works correctly
    const config = defaultConfig({ onTip });
    const { rerender } = renderHook((props: UseCoachTipsConfig) => useCoachTips(props), {
      initialProps: config,
    });

    await new Promise((r) => setTimeout(r, 1500));

    rerender({
      ...config,
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Should fall through to a positional tip (e.g., development reminder)
    expect(onTip).toHaveBeenCalled();
  });

  it('fires a mate threat tip when mate is imminent', async () => {
    vi.useRealTimers();
    const onTip = vi.fn();
    const analysis = buildAnalysis({
      isMate: true,
      mateIn: -3,
      topLines: [
        { rank: 1, moves: ['e2e4'], evaluation: -3000, mate: null },
        { rank: 2, moves: ['d2d4'], evaluation: -2800, mate: null },
      ],
    });
    mockAnalyze.mockResolvedValue(analysis);

    const config = defaultConfig({ onTip });
    const { rerender } = renderHook((props: UseCoachTipsConfig) => useCoachTips(props), {
      initialProps: config,
    });

    await new Promise((r) => setTimeout(r, 1500));

    rerender({
      ...config,
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    });

    await new Promise((r) => setTimeout(r, 1500));

    expect(onTip).toHaveBeenCalledWith(
      expect.stringContaining('mate threat'),
    );
  });
});
