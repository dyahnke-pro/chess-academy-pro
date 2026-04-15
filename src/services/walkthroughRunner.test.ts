import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runStep, clampBackupMs } from './walkthroughRunner';
import { voiceService } from './voiceService';
import type { WalkthroughStep } from '../types/walkthrough';

function makeStep(overrides: Partial<WalkthroughStep> = {}): WalkthroughStep {
  return {
    moveNumber: 1,
    san: 'e4',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    narration: 'King pawn forward. Controls the center.',
    ...overrides,
  };
}

describe('clampBackupMs', () => {
  it('scales with word count', () => {
    const short = clampBackupMs('One.');
    const long = clampBackupMs(
      'This narration has a lot of words to speak and should take longer to finish playing.',
    );
    expect(long).toBeGreaterThan(short);
  });

  it('never returns less than the minimum', () => {
    expect(clampBackupMs('')).toBeGreaterThanOrEqual(1500);
  });

  it('never returns more than the max safety timeout', () => {
    const text = Array(500).fill('word').join(' ');
    expect(clampBackupMs(text)).toBeLessThanOrEqual(20_000);
  });

  it('shortens when speed is faster', () => {
    const normal = clampBackupMs('A reasonably long narration for testing.', 1);
    const fast = clampBackupMs('A reasonably long narration for testing.', 2);
    expect(fast).toBeLessThanOrEqual(normal);
  });
});

describe('runStep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolves with completed=true when voice finishes naturally', async () => {
    const speakSpy = vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    vi.spyOn(voiceService, 'stop').mockImplementation(() => {});

    const { done } = runStep(makeStep());
    // let the speak promise resolve then flush the post-narration buffer
    await vi.advanceTimersByTimeAsync(500);

    const result = await done;
    expect(result.completed).toBe(true);
    expect(result.cancelled).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(speakSpy).toHaveBeenCalledWith(
      'King pawn forward. Controls the center.',
    );
  });

  it('cancels cleanly when caller calls cancel()', async () => {
    // Speak returns a promise that never resolves so we stay in-flight.
    vi.spyOn(voiceService, 'speak').mockImplementation(() => new Promise(() => {}));
    const stopSpy = vi.spyOn(voiceService, 'stop').mockImplementation(() => {});

    const { done, cancel } = runStep(makeStep());
    cancel();

    const result = await done;
    expect(result.cancelled).toBe(true);
    expect(result.completed).toBe(false);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('falls through to timeout when voice hangs', async () => {
    vi.spyOn(voiceService, 'speak').mockImplementation(() => new Promise(() => {}));
    const stopSpy = vi.spyOn(voiceService, 'stop').mockImplementation(() => {});

    const { done } = runStep(makeStep());
    await vi.advanceTimersByTimeAsync(25_000);

    const result = await done;
    expect(result.timedOut).toBe(true);
    expect(result.cancelled).toBe(false);
    expect(result.completed).toBe(false);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('resolves immediately when silent=true', async () => {
    const speakSpy = vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);

    const { done } = runStep(makeStep(), { silent: true });
    const result = await done;

    expect(result.completed).toBe(true);
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('resolves immediately when narration is empty', async () => {
    const speakSpy = vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);

    const { done } = runStep(makeStep({ narration: '' }));
    const result = await done;

    expect(result.completed).toBe(true);
    expect(speakSpy).not.toHaveBeenCalled();
  });
});
