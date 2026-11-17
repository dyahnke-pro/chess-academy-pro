// THE ONE SLOT AND THE ONE BUTTON (David 2026-11-17: "one button for
// unification … make sure they all do the same thing"): a source states its
// line, the button plays every stated line move by move, each move's reason
// said as it lands, then the board returns to the game.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { walkableLine } from '../services/proof';

vi.mock('../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});

import { useLineWalk } from './useLineWalk';
import { voiceService } from '../services/voiceService';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('useLineWalk — the line just stated', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('nothing stated: no play (the button greys out)', () => {
    const { result } = renderHook(() => useLineWalk('white'));
    expect(result.current.playStated).toBeNull();
  });

  it('plays the stated line move by move, saying a move\'s reason, then returns to the game', async () => {
    const line = walkableLine(START, ['e4', 'e5', 'Nf3'], 'e4');
    if (!line) throw new Error('line');
    line.plies[0] = { ...line.plies[0], why: 'It takes the centre.' };
    const { result } = renderHook(() => useLineWalk('white'));
    act(() => { result.current.state([line]); });
    expect(result.current.playStated).not.toBeNull();
    act(() => { result.current.playStated?.(); });
    expect(result.current.walkFen).toBe(START);
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(result.current.walkFen).toBe(line.plies[0].fenAfter);
    expect(vi.mocked(voiceService.speakReadAloud)).toHaveBeenCalledWith('It takes the centre.');
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(result.current.walkFen).toBeNull();
  });

  it('a new statement replaces the old one; an empty statement clears it', () => {
    const a = walkableLine(START, ['e4'], 'e4');
    const b = walkableLine(START, ['d4'], 'd4');
    if (!a || !b) throw new Error('line');
    const { result } = renderHook(() => useLineWalk('white'));
    act(() => { result.current.state([a]); });
    act(() => { result.current.state([b]); });
    expect(result.current.stated).toEqual([b]);
    act(() => { result.current.state([]); });
    expect(result.current.playStated).toBeNull();
  });
});
