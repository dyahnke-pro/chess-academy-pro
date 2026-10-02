// NO TRANSITION CUTS THE VOICE (David 2026-10-02: "Auto advance needs to not
// cut off narrations … Instant after last word can sound like cut off"). The
// solve's line was fetched for 2.2s with `isPlaying()` still false, so anything
// that asked "is the voice busy?" in that window said no and moved on over it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Svc = {
  untilQuiet: (o?: { maxWaitMs?: number; breathMs?: number; graceMs?: number }) => Promise<void>;
  speakInternal: (t: string, f: boolean) => Promise<void>;
  speakInternalTracked: (t: string, f: boolean) => Promise<void>;
};

async function load(): Promise<Svc> {
  vi.resetModules();
  return (await import('./voiceService')).voiceService as unknown as Svc;
}

describe('voiceService.untilQuiet', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('waits through the synthesis fetch and the speech, then holds a breath', async () => {
    const svc = await load();
    let finish: () => void = () => undefined;
    vi.spyOn(svc, 'speakInternalTracked').mockImplementation(() => new Promise<void>((r) => { finish = r; }));
    void svc.speakInternal('It repositions the bishop to e6.', false);
    let done = false;
    const p = svc.untilQuiet({ graceMs: 0, breathMs: 800 }).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(3000);
    expect(done).toBe(false);            // still fetching/speaking — the board waits
    finish();
    await vi.advanceTimersByTimeAsync(400);
    expect(done).toBe(false);            // the last word just ended — a breath first
    await vi.advanceTimersByTimeAsync(600);
    await p;
    expect(done).toBe(true);
  });

  it('returns after only the grace when nothing is speaking', async () => {
    const svc = await load();
    let done = false;
    const p = svc.untilQuiet({ graceMs: 300 }).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(300);
    await p;
    expect(done).toBe(true);
  });

  it('never strands the screen on a wedged voice', async () => {
    const svc = await load();
    vi.spyOn(svc, 'speakInternalTracked').mockImplementation(() => new Promise<void>(() => undefined));
    void svc.speakInternal('wedged', false);
    let done = false;
    const p = svc.untilQuiet({ graceMs: 0, maxWaitMs: 5000, breathMs: 0 }).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(5200);
    await p;
    expect(done).toBe(true);
  });
});
