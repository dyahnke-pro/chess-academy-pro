import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReviewBlunderCapture } from './useReviewBlunderCapture';

// RETIRED to an inert stub (David 2026-06-11): the per-ply review "why?" prompt
// is gone — capture is automated on review mount. These tests pin the inert
// contract so the pop-up can't silently come back.

describe('useReviewBlunderCapture (retired stub)', () => {
  it('starts idle and stays idle when a ply lands', () => {
    const { result } = renderHook(() =>
      useReviewBlunderCapture({ moves: [], playerColor: 'white' }),
    );
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
    act(() => { result.current.onPlyLanded(3); });
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
  });
});
