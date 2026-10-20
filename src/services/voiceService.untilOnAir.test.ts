// THE LINE ON ITS WAY REACHES THE SPEAKER FIRST (OS-18 replay 2026-10-20,
// 14.Rd5: the verdict was handed to the voice at +4.7 s and started at +9.2 s,
// every step between queued behind the turn's synchronous reads). A caller
// holds heavy work on `untilOnAir` until the student is already hearing.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Svc = {
  untilOnAir: (maxWaitMs: number) => Promise<void>;
  speakInternal: (t: string, f: boolean) => Promise<void>;
  speakInternalTracked: (t: string, f: boolean) => Promise<void>;
};

async function load(): Promise<Svc> {
  vi.resetModules();
  return (await import('./voiceService')).voiceService as unknown as Svc;
}

describe('voiceService.untilOnAir', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('waits while the line is on its way, and lets go the moment it plays', async () => {
    const svc = await load();
    vi.spyOn(svc, 'speakInternalTracked').mockImplementation(() => new Promise<void>(() => undefined));
    void svc.speakInternal('Rd5 was a mistake — it let them take your knight on c3.', true);
    let done = false;
    const p = svc.untilOnAir(4000).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(1500);
    expect(done).toBe(false);            // fetching — not heard yet
    (svc as unknown as { playing: boolean }).playing = true;
    await vi.advanceTimersByTimeAsync(60);
    await p;
    expect(done).toBe(true);             // playing — the heavy work may start
  });

  it('a line waiting behind one that is playing is still on its way', async () => {
    const svc = await load();
    vi.spyOn(svc, 'speakInternalTracked').mockImplementation(() => new Promise<void>(() => undefined));
    void svc.speakInternal('Got it — after your move, they play Qb4.', true);
    (svc as unknown as { playing: boolean }).playing = true;   // the earlier line is playing
    void svc.speakInternal('Careful — your bishop on f4 is attacked.', true);
    let done = false;
    const p = svc.untilOnAir(4000).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(3100);
    await p;
  });

  it('lets go at once when nothing is on its way', async () => {
    const svc = await load();
    let done = false;
    const p = svc.untilOnAir(4000).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });

  it('never strands the caller on a wedged voice', async () => {
    const svc = await load();
    vi.spyOn(svc, 'speakInternalTracked').mockImplementation(() => new Promise<void>(() => undefined));
    void svc.speakInternal('wedged', true);
    let done = false;
    const p = svc.untilOnAir(4000).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(3900);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await p;
    expect(done).toBe(true);
  });
});
