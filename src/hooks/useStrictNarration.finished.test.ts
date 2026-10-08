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
});
