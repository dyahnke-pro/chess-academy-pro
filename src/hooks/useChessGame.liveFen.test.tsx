/**
 * The board's FEN must be LIVE, not the render-time snapshot.
 *
 * `fen` is React state, so before 2026-09-17 a caller that mutated the board
 * and read `game.fen` in the SAME TICK got the position from BEFORE the
 * mutation. Every read looked right, because one render later it was. It cost
 * a coach takeback: `handleTakeBack` undid the coach's move, re-derived the
 * FEN from this field — getting the position it had just undone — and probed
 * the dictated replacement against it. The replacement was "illegal", so the
 * board sat taken back with nothing played, and the transcript said the board
 * had been left alone.
 *
 * These tests read the value THROUGH A REF, which is the only way to observe
 * the bug: a render-time read cannot, because by then state has caught up.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useChessGame } from './useChessGame';

function useGameWithRef() {
  const game = useChessGame();
  const ref = useRef(game);
  ref.current = game;
  return { game, ref };
}

describe('useChessGame — the FEN is live, not the render snapshot', () => {
  it('reflects a move made in the same tick', () => {
    const { result } = renderHook(() => useGameWithRef());
    act(() => {
      result.current.ref.current.makeMove('e2', 'e4');
      // read IMMEDIATELY, before React re-renders
      expect(result.current.ref.current.fen).toContain('4P3');
    });
  });

  it('reflects an undo made in the same tick — the takeback case', () => {
    const { result } = renderHook(() => useGameWithRef());
    act(() => { result.current.ref.current.makeMove('e2', 'e4'); });
    act(() => { result.current.ref.current.makeMove('e7', 'e5'); });
    const beforeUndo = result.current.game.fen;
    act(() => {
      result.current.ref.current.undoMove();
      const afterUndo = result.current.ref.current.fen;
      expect(afterUndo).not.toBe(beforeUndo);
      // and it is the position the coach would have to play INTO
      expect(afterUndo).toBe(result.current.ref.current.getFen());
    });
  });

  it('`position` tracks `fen` — a consumer may read either', () => {
    const { result } = renderHook(() => useGameWithRef());
    act(() => {
      result.current.ref.current.makeMove('d2', 'd4');
      expect(result.current.ref.current.position).toBe(result.current.ref.current.fen);
      expect(result.current.ref.current.position).toContain('3P4');
    });
  });

  it('a reset is visible in the same tick, so a new game never inherits the old position', () => {
    const { result } = renderHook(() => useGameWithRef());
    act(() => { result.current.ref.current.makeMove('e2', 'e4'); });
    act(() => {
      result.current.ref.current.resetGame();
      // The WHOLE fen, not a prefix: after 1.e4 Black's two ranks are still
      // 'rnbqkbnr/pppppppp', so a prefix match passes on the stale value too.
      expect(result.current.ref.current.fen)
        .toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });
  });
});
