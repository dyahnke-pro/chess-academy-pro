import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Chess } from 'chess.js';

vi.mock('../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});

import { useLineWalk } from './useLineWalk';
import { MS_PER_CHAR } from '../services/markPacing';

// The question box on the puzzle screens drew nothing on the board (marks
// sweep 2026-11-08): "Your knight on f3 hits e5 twice" lit nothing.
const FEN = (() => { const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6']) c.move(s); return c.fen(); })();

describe('an answer marks the board as it is said', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows the question position, lights a named square at its word, arrows a named move at its word', async () => {
    const { result } = renderHook(() => useLineWalk('white'));
    const text = 'Their pawn on e5 is guarded once. Bb5 pins the knight that guards it.';
    await act(async () => { result.current.markAnswer(text, FEN, []); await Promise.resolve(); });
    expect(result.current.walkFen).toBe(FEN);
    expect(result.current.markHighlights).toEqual([]);
    await act(async () => { vi.advanceTimersByTime(text.indexOf('e5') * MS_PER_CHAR + 1); });
    expect(result.current.markHighlights).toEqual(['e5']);
    expect(result.current.markArrows).toEqual([]);
    await act(async () => { vi.advanceTimersByTime((text.indexOf('Bb5') + 1 - text.indexOf('e5')) * MS_PER_CHAR); });
    expect(result.current.markArrows.map((a) => `${a.startSquare}${a.endSquare}`)).toEqual(['f1b5']);
  });

  it('a walk takes the board and the answer marks come down', async () => {
    const { result } = renderHook(() => useLineWalk('white'));
    await act(async () => { result.current.markAnswer('Their pawn on e5 is loose.', FEN, []); await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(5000); });
    act(() => { result.current.walk({ label: 'Nxe5', startFen: FEN, plies: [] }); });
    expect(result.current.markHighlights).toEqual([]);
  });
});
