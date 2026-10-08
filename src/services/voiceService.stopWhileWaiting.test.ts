// A line that is WAITING when a real stop() lands must never play.
//
// David 2026-10-08: "Often narration continues playing once an opening is done.
// I was back to the completed walkthrough screen and the coach started its
// closing remarks." The opening's last beat was requested, sat in the spacing
// floor / turn wait, the lesson closed and called stop() — and the line woke up
// afterwards and played over the screen the student had moved to, because the
// stop counter was read only AFTER the waits. These tests stop the service
// while a line waits and assert it never reaches playback.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Internals = {
  playing: boolean;
  lastAdmittedSpeak: { text: string; ts: number } | null;
  spokenLedger: Map<string, number>;
  haltPlayback: () => void;
};

const PLAYED = 'reached playback';

async function load(): Promise<{ voiceService: typeof import('./voiceService').voiceService; svc: Internals; played: string[] }> {
  const { voiceService } = await import('./voiceService');
  const svc = voiceService as unknown as Internals;
  const played: string[] = [];
  // Every line that is about to take the air calls haltPlayback() first; a
  // real stop() also calls it, so record only calls made from a speak.
  const realHalt = svc.haltPlayback.bind(svc);
  vi.spyOn(svc, 'haltPlayback').mockImplementation(() => {
    const stack = new Error().stack ?? '';
    if (stack.includes('speakInternalTracked')) { played.push('line'); throw new Error(PLAYED); }
    realHalt();
  });
  return { voiceService, svc, played };
}

describe('a real stop cancels a line that is still waiting', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('waiting for its turn: stop() → the line never plays', async () => {
    const { voiceService, svc, played } = await load();
    svc.playing = true; // the previous beat is still on the air
    const done = voiceService.speakLecture('That is the closing remark of the opening.').catch(() => undefined);
    await vi.advanceTimersByTimeAsync(200);
    voiceService.stop(); // the lesson closed
    svc.playing = false;
    await vi.advanceTimersByTimeAsync(2_000);
    await done;
    expect(played).toEqual([]);
  });

  it('waiting out the spacing floor: stop() → never plays, and is not marked as said', async () => {
    const { voiceService, svc, played } = await load();
    svc.lastAdmittedSpeak = { text: 'the beat before', ts: Date.now() };
    const line = 'And that wraps up the main line.';
    const done = voiceService.speakLecture(line).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);
    voiceService.stop();
    await vi.advanceTimersByTimeAsync(1_000);
    await done;
    expect(played).toEqual([]);
    expect(svc.spokenLedger.has(line), 'a cancelled line was recorded as said').toBe(false);
  });

  it('control: with no stop, the waiting line still plays', async () => {
    const { voiceService, svc, played } = await load();
    svc.playing = true;
    const done = voiceService.speakLecture('A line that waits its turn and is heard.').catch(() => undefined);
    await vi.advanceTimersByTimeAsync(200);
    svc.playing = false;
    await vi.advanceTimersByTimeAsync(2_000);
    await done;
    expect(played).toEqual(['line']);
  });
});
