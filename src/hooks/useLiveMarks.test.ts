import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Chess } from 'chess.js';

vi.mock('../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});

import { useLiveMarks } from './useLiveMarks';
import { MS_PER_CHAR } from '../services/markPacing';

// A puzzle's own lines set their arrows before the voice and lit nothing
// (marks sweep 2026-11-08).
const FEN = (() => { const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6']) c.move(s); return c.fen(); })();
const TEXT = 'Their pawn on e5 is guarded once. Bb5 pins the knight that guards it.';

describe('what a board says is marked as it is said, on the live board', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('lights the named square at its word and draws the move at its own', async () => {
    const { result } = renderHook(() => useLiveMarks('white'));
    const arrow = { startSquare: 'f1', endSquare: 'b5', color: '#22c55e' };
    await act(async () => { result.current.say(TEXT, FEN, { arrows: [arrow] }); await Promise.resolve(); });
    expect(result.current.highlights).toEqual([]);
    expect(result.current.arrows).toEqual([]);
    await act(async () => { vi.advanceTimersByTime(TEXT.indexOf('e5') * MS_PER_CHAR + 1); });
    expect(result.current.highlights).toEqual(['e5']);
    await act(async () => { vi.advanceTimersByTime((TEXT.indexOf('Bb5') + 1 - TEXT.indexOf('e5')) * MS_PER_CHAR); });
    expect(result.current.arrows).toEqual([arrow]);
  });

  it('with no voice every mark goes up at once', () => {
    const { result } = renderHook(() => useLiveMarks('white'));
    act(() => { result.current.say(TEXT, FEN, { voiced: false }); });
    expect(result.current.highlights).toEqual(['e5']);
    expect(result.current.arrows.map((a) => `${a.startSquare}${a.endSquare}`)).toEqual(['f1b5']);
  });
});
