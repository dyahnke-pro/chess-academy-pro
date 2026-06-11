import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReviewBlunderCapture } from './useReviewBlunderCapture';
import type { CoachGameMove } from '../types';

// David 2026-06-11: the "You played <X> here — what was the idea behind it?"
// prompt was pinning to the first blunder and haunting every later position
// (and the opponent's moves) because onPlyLanded short-circuited whenever a
// prompt was open. These tests lock the per-ply binding: the prompt belongs to
// ITS OWN ply and clears when the review walk moves elsewhere.

function gm(over: Partial<CoachGameMove> & { moveNumber: number; san: string; fen: string }): CoachGameMove {
  return {
    isCoachMove: false,
    commentary: '',
    evaluation: 0,
    classification: 'good',
    expanded: false,
    bestMove: null,
    bestMoveEval: null,
    preMoveEval: 0,
    ...over,
  };
}

// 1.e4 e5 2.Qh5?? Nc6 3.Bxf7+?? — two white (player) blunders with an
// opponent move between them.
const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const FEN_AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const FEN_AFTER_QH5 = 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
const FEN_AFTER_NC6 = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3';

const moves: CoachGameMove[] = [
  gm({ moveNumber: 1, san: 'e4', fen: FEN_AFTER_E4, classification: 'good' }),
  gm({ moveNumber: 1, san: 'e5', fen: FEN_AFTER_E5, classification: 'good', isCoachMove: true }),
  gm({ moveNumber: 2, san: 'Qh5', fen: FEN_AFTER_QH5, classification: 'blunder', preMoveEval: 25, evaluation: -250 }),
  gm({ moveNumber: 2, san: 'Nc6', fen: FEN_AFTER_NC6, classification: 'good', isCoachMove: true }),
];

describe('useReviewBlunderCapture — per-ply prompt binding', () => {
  it('raises the "why?" prompt on the player blunder with that move SAN', () => {
    const { result } = renderHook(() =>
      useReviewBlunderCapture({ moves, playerColor: 'white' }),
    );
    act(() => result.current.onPlyLanded(3)); // ply 3 = Qh5 (player blunder)
    expect(result.current.phase).toBe('asking');
    expect(result.current.prompt?.playedSan).toBe('Qh5');
  });

  it('clears the prompt when the walk moves OFF the blunder ply (the Qxa7 bug)', () => {
    const { result } = renderHook(() =>
      useReviewBlunderCapture({ moves, playerColor: 'white' }),
    );
    act(() => result.current.onPlyLanded(3));
    expect(result.current.prompt?.playedSan).toBe('Qh5');
    // Navigate forward to the opponent's reply — the prompt must NOT linger.
    act(() => result.current.onPlyLanded(4));
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
  });

  it('keeps the prompt while the walk stays on its own ply (re-render no-op)', () => {
    const { result } = renderHook(() =>
      useReviewBlunderCapture({ moves, playerColor: 'white' }),
    );
    act(() => result.current.onPlyLanded(3));
    // Effect re-fires with the same ply on every render — must not clear.
    act(() => result.current.onPlyLanded(3));
    expect(result.current.phase).toBe('asking');
    expect(result.current.prompt?.playedSan).toBe('Qh5');
  });

  it('never raises on the opponent\'s move', () => {
    const { result } = renderHook(() =>
      useReviewBlunderCapture({ moves, playerColor: 'white' }),
    );
    act(() => result.current.onPlyLanded(2)); // ply 2 = e5 (opponent)
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
  });
});
