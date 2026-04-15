import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '../test/utils';
import { useWalkthroughRunner } from './useWalkthroughRunner';
import { voiceService } from '../services/voiceService';
import { buildSession } from '../services/walkthroughAdapter';

const session = buildSession({
  title: 'Italian Opening',
  pgn: 'e4 e5 Nf3 Nc6 Bc4',
});

describe('useWalkthroughRunner', () => {
  beforeEach(() => {
    vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    vi.spyOn(voiceService, 'stop').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in the pre-start state with startFen on the board', () => {
    const { result } = renderHook(() =>
      useWalkthroughRunner(session, { silent: true }),
    );
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentStep).toBe(null);
    expect(result.current.fen).toContain('rnbqkbnr'); // start pos
    expect(result.current.isPlaying).toBe(false);
  });

  it('next() advances one step at a time and updates the fen', () => {
    const { result } = renderHook(() =>
      useWalkthroughRunner(session, { silent: true }),
    );
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentStep?.san).toBe('e4');
    expect(result.current.fen).toBe(session.steps[0].fenAfter);

    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentStep?.san).toBe('e5');
  });

  it('prev() steps backward and rewinds the board', () => {
    const { result } = renderHook(() =>
      useWalkthroughRunner(session, { silent: true }),
    );
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.fen).toBe(session.steps[0].fenAfter);
  });

  it('next() never advances past the end', () => {
    const { result } = renderHook(() =>
      useWalkthroughRunner(session, { silent: true }),
    );
    for (let i = 0; i < session.steps.length + 5; i++) {
      act(() => result.current.next());
    }
    expect(result.current.currentIndex).toBe(session.steps.length - 1);
    expect(result.current.isFinished).toBe(true);
  });

  it('play() starts auto-advance from the pre-start state', async () => {
    const { result } = renderHook(() =>
      useWalkthroughRunner(session, { silent: true }),
    );
    act(() => result.current.play());
    await waitFor(() => {
      expect(result.current.currentIndex).toBeGreaterThanOrEqual(0);
    });
    expect(result.current.isPlaying).toBe(true);
  });

  it('pause() cancels in-flight narration and stops auto-advance', () => {
    const stopSpy = vi.spyOn(voiceService, 'stop');
    const { result } = renderHook(() =>
      useWalkthroughRunner(session, { silent: false }),
    );
    act(() => result.current.play());
    act(() => result.current.pause());
    expect(result.current.isPlaying).toBe(false);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('restart() returns to the pre-start state', () => {
    const { result } = renderHook(() =>
      useWalkthroughRunner(session, { silent: true }),
    );
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.restart());
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.fen).toContain('rnbqkbnr');
  });

  it('resets when a new session is passed in', () => {
    const { result, rerender } = renderHook(
      ({ s }) => useWalkthroughRunner(s, { silent: true }),
      { initialProps: { s: session } },
    );
    act(() => result.current.next());
    act(() => result.current.next());

    const secondSession = buildSession({
      title: 'Sicilian',
      pgn: 'e4 c5',
    });
    rerender({ s: secondSession });

    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.isPlaying).toBe(false);
  });
});
