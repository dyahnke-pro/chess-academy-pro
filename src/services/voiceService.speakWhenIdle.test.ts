// NEVER CUT, NEVER DROP (PostHog, David's phone, 2026-10-02): a puzzle's
// struggle coach fired over the wrong-try refutation and cut it mid-sentence.
// `speakWhenIdle` waits for the line in flight; the muted audit path reports
// itself as playing so an audit sees the same busy voice a phone does.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Svc = {
  speakWhenIdle: (t: string, o?: { stale?: () => boolean; maxWaitMs?: number; onStart?: () => void }) => Promise<void>;
  isPlaying: () => boolean;
  stop: () => void;
  speakInternal: (t: string, f: boolean) => Promise<void>;
  simulateSpeechDuration: (t: string) => Promise<void>;
};

async function load(): Promise<Svc> {
  vi.resetModules();
  return (await import('./voiceService')).voiceService as unknown as Svc;
}

describe('voiceService.speakWhenIdle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('waits for the line in flight to finish, then speaks — it does not cut it', async () => {
    const svc = await load();
    let playing = true;
    vi.spyOn(svc, 'isPlaying').mockImplementation(() => playing);
    const stop = vi.spyOn(svc, 'stop');
    const inner = vi.spyOn(svc, 'speakInternal').mockResolvedValue(undefined);
    const onStart = vi.fn();
    const p = svc.speakWhenIdle('This was the moment to slow down.', { onStart });
    await vi.advanceTimersByTimeAsync(1000);
    expect(inner).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    playing = false;
    await vi.advanceTimersByTimeAsync(250);
    await p;
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledWith('This was the moment to slow down.', false);
  });

  it('gives up when the moment has passed (a new try), and says nothing', async () => {
    const svc = await load();
    vi.spyOn(svc, 'isPlaying').mockReturnValue(true);
    const inner = vi.spyOn(svc, 'speakInternal').mockResolvedValue(undefined);
    let stale = false;
    const p = svc.speakWhenIdle('late line', { stale: () => stale });
    await vi.advanceTimersByTimeAsync(400);
    stale = true;
    await vi.advanceTimersByTimeAsync(400);
    await p;
    expect(inner).not.toHaveBeenCalled();
  });

  it('a muted (audit) line counts as playing for its duration, and stop() ends it', async () => {
    const svc = await load();
    const p = svc.simulateSpeechDuration('one two three four five six seven eight');
    expect(svc.isPlaying()).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    await p;
    expect(svc.isPlaying()).toBe(false);
    const q = svc.simulateSpeechDuration('one two three four five six seven eight');
    expect(svc.isPlaying()).toBe(true);
    svc.stop();
    await vi.advanceTimersByTimeAsync(200);
    await q;
    expect(svc.isPlaying()).toBe(false);
  });
});
