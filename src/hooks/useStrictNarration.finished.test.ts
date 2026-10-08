import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/voiceService', () => ({
  voiceService: { stop: vi.fn(), speak: vi.fn(() => Promise.resolve()) },
}));

import { useStrictNarration } from './useStrictNarration';

// A lesson is FINISHED when its last line has been spoken — not when the last
// step arrives (David 2026-10-08: the opening's wrap-up played over the page the
// lesson bounced to, because "complete" fired as the last beat began).
describe('useStrictNarration isFinished', () => {
  let resolveSpeech: (() => void) | null;
  const speak = vi.fn(() => new Promise<void>((r) => { resolveSpeech = r; }));

  beforeEach(() => {
    resolveSpeech = null;
    speak.mockClear();
  });

  function renderAuto(initialStepIndex: number): ReturnType<typeof renderHook<ReturnType<typeof useStrictNarration>, unknown>> {
    return renderHook(() => useStrictNarration({
      stepCount: 3,
      applyStep: () => undefined,
      getNarration: (i) => `line ${i}`,
      postNarrationDelayMs: 0,
      voiceEnabled: true,
      initialStepIndex,
      speak,
      initialAutoPlay: true,
    }));
  }

  function render(initialStepIndex: number): ReturnType<typeof renderHook<ReturnType<typeof useStrictNarration>, unknown>> {
    return renderHook(() => useStrictNarration({
      stepCount: 3,
      applyStep: () => undefined,
      getNarration: (i) => `line ${i}`,
      postNarrationDelayMs: 0,
      voiceEnabled: true,
      initialStepIndex,
      speak,
    }));
  }

  it('stays false while the last line is still being spoken, then turns true', async () => {
    const { result } = render(2);
    expect(speak).toHaveBeenCalledWith('line 2');
    expect(result.current.isFinished).toBe(false);
    await act(async () => { resolveSpeech?.(); });
    expect(result.current.isFinished).toBe(true);
  });

  it('never finishes on a step before the last', async () => {
    const { result } = render(1);
    await act(async () => { resolveSpeech?.(); });
    expect(result.current.isFinished).toBe(false);
  });

  it('a line cut off by a newer step does not count as finished', async () => {
    const { result } = render(2);
    const first = resolveSpeech;
    act(() => { result.current.prev(); });
    await act(async () => { first?.(); });
    expect(result.current.isFinished).toBe(false);
  });

  it('tapping Next onto the last beat while auto-playing: that beat speaks and the lesson finishes', async () => {
    const { voiceService } = await import('../services/voiceService');
    const { result } = renderAuto(1);
    const stopsBefore = vi.mocked(voiceService.stop).mock.calls.length;
    act(() => { result.current.next(); });
    expect(speak).toHaveBeenLastCalledWith('line 2');
    // Only playStep's own stop (cutting the OLD line) — the pause must not
    // stop the voice a second time and kill the new line.
    expect(vi.mocked(voiceService.stop).mock.calls.length - stopsBefore).toBe(1);
    await act(async () => { resolveSpeech?.(); });
    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.isFinished).toBe(true);
  });

  it('the pause button still stops the voice', async () => {
    const { voiceService } = await import('../services/voiceService');
    const { result } = renderAuto(1);
    const stopsBefore = vi.mocked(voiceService.stop).mock.calls.length;
    act(() => { result.current.toggleAutoPlay(); });
    expect(vi.mocked(voiceService.stop).mock.calls.length - stopsBefore).toBe(1);
    await act(async () => { resolveSpeech?.(); });
    expect(result.current.isFinished).toBe(false);
  });
});
