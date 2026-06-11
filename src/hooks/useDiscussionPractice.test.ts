import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiscussionPractice } from './useDiscussionPractice';

// The live "why did you play that?" faucet is RETIRED to an inert stub
// (David 2026-06-11). Misconception capture is automated from analyzed games
// now; the hook raises no prompt and runs no per-move analysis. These tests
// pin the inert contract so a future change can't silently revive the pop-up.

describe('useDiscussionPractice (retired stub)', () => {
  it('starts idle with no prompt or teach', () => {
    const { result } = renderHook(() => useDiscussionPractice(true));
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
    expect(result.current.teach).toBeNull();
  });

  it('evaluatePlayerMove never raises a prompt', async () => {
    const { result } = renderHook(() => useDiscussionPractice(true));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        playedSan: 'e4',
        playerColor: 'white',
        inBook: false,
        learned: true,
        gamePhase: 'opening',
      });
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
  });

  it('raiseSlipPrompt is a no-op', () => {
    const { result } = renderHook(() => useDiscussionPractice(true));
    act(() => {
      result.current.raiseSlipPrompt({
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        playedSan: 'e4',
        cpLoss: 500,
        shouldCount: true,
        gamePhase: 'opening',
      });
    });
    expect(result.current.phase).toBe('idle');
  });
});
