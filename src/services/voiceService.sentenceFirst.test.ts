// SENTENCE-FIRST FOR LONG LINES (David 2026-10-02: "Only where there is a
// delay"). Measured against prod: `/api/tts` synthesises the whole line before
// its first byte, so a 600-character opening beat waited ~7s for any sound.
// Long lines now speak their first sentence while the rest load; short lines
// are untouched. Prefetch keys the same pieces the speak path plays.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { splitSpokenChunks, LONG_LINE_CHARS, sanitizeForTTS } from './voiceService';

type Svc = {
  speakCloudChunked: (t: string, v: string) => Promise<boolean>;
  speakCloud: (t: string, v: string) => Promise<boolean>;
  speakFallback: (t: string) => Promise<void>;
  fetchClipToCache: (t: string, v: string, s?: string) => Promise<void>;
  prefetchAudio: (t: string[]) => Promise<void>;
  loadPrefs: () => Promise<unknown>;
  isPollyLive: () => boolean;
  isAuditMuted: () => boolean;
  stop: () => void;
  playing: boolean;
};

async function load(): Promise<Svc> {
  vi.resetModules();
  return (await import('./voiceService')).voiceService as unknown as Svc;
}

const LONG = 'It repositions the bishop to e6, eyeing d5, c4 and f5. That takes the light squares away from their knight. '
  + 'Now the pawn on d5 has no defender left, and your rook can come to the d-file to collect it.';

describe('splitSpokenChunks', () => {
  it('leaves a short line whole — no change where there was no delay', () => {
    const short = 'The key square is e6. What can reach it?';
    expect(short.length).toBeLessThanOrEqual(LONG_LINE_CHARS);
    expect(splitSpokenChunks(short)).toEqual([short]);
  });

  it('splits a long line by sentence, losing no words', () => {
    const parts = splitSpokenChunks(LONG);
    expect(parts.length).toBe(3);
    expect(parts.join(' ')).toBe(LONG);
    expect(parts[0]).toBe('It repositions the bishop to e6, eyeing d5, c4 and f5.');
  });

  it('never leaves a choppy fragment — short sentences ride with the next', () => {
    const t = 'Right. ' + 'x'.repeat(10) + ' word. ' + 'This sentence is long enough to stand on its own for a while. '
      + 'And so is this one, which carries the line well past the long-line threshold for sure.';
    for (const p of splitSpokenChunks(t)) expect(p.length).toBeGreaterThanOrEqual(40);
    expect(splitSpokenChunks(t).join(' ')).toBe(t);
  });

  it('does not split inside a decimal', () => {
    const t = 'The engine gives 3.5 pawns here and the position is winning for you. '.repeat(3).trim();
    for (const p of splitSpokenChunks(t)) expect(p).not.toMatch(/^5 pawns/);
  });
});

describe('speakCloudChunked', () => {
  beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new ArrayBuffer(1024))); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('plays a long line piece by piece, in order', async () => {
    const svc = await load();
    const said: string[] = [];
    vi.spyOn(svc, 'speakCloud').mockImplementation(async (t) => { said.push(t); return true; });
    expect(await svc.speakCloudChunked(LONG, 'ruth')).toBe(true);
    expect(said).toEqual(splitSpokenChunks(LONG));
    expect(svc.playing).toBe(false);
  });

  it('a short line goes through whole', async () => {
    const svc = await load();
    const cloud = vi.spyOn(svc, 'speakCloud').mockResolvedValue(true);
    await svc.speakCloudChunked('Look at what your bishop can do.', 'ruth');
    expect(cloud).toHaveBeenCalledTimes(1);
    expect(cloud.mock.calls[0][0]).toBe('Look at what your bishop can do.');
  });

  it('stops at once when a newer line or stop() arrives', async () => {
    const svc = await load();
    const said: string[] = [];
    vi.spyOn(svc, 'speakCloud').mockImplementation(async (t) => { said.push(t); svc.stop(); return true; });
    await svc.speakCloudChunked(LONG, 'ruth');
    expect(said).toHaveLength(1);
  });

  it('first piece fails → false, so the whole-line fallback runs as before', async () => {
    const svc = await load();
    vi.spyOn(svc, 'speakCloud').mockResolvedValue(false);
    const fb = vi.spyOn(svc, 'speakFallback').mockResolvedValue(undefined);
    expect(await svc.speakCloudChunked(LONG, 'ruth')).toBe(false);
    expect(fb).not.toHaveBeenCalled();
  });

  it('a later piece fails → the rest finishes in the device voice, not from the top', async () => {
    const svc = await load();
    let n = 0;
    vi.spyOn(svc, 'speakCloud').mockImplementation(async () => (n++ === 0));
    const fb = vi.spyOn(svc, 'speakFallback').mockResolvedValue(undefined);
    expect(await svc.speakCloudChunked(LONG, 'ruth')).toBe(true);
    expect(fb).toHaveBeenCalledWith(splitSpokenChunks(LONG).slice(1).join(' '));
  });
});

describe('prefetchAudio', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches the SANITIZED pieces the speak path will ask for', async () => {
    const svc = await load();
    vi.spyOn(svc, 'loadPrefs').mockResolvedValue({ cloudEnabled: true, voiceEnabled: true, coachPersonality: 'default' });
    vi.spyOn(svc, 'isPollyLive').mockReturnValue(true);
    vi.spyOn(svc, 'isAuditMuted').mockReturnValue(false);
    const got: string[] = [];
    vi.spyOn(svc, 'fetchClipToCache').mockImplementation(async (t) => { got.push(t); });
    await svc.prefetchAudio(['b5 lets them play Qxd7, winning your bishop on d7.']);
    expect(got).toEqual([sanitizeForTTS('b5 lets them play Qxd7, winning your bishop on d7.')]);
    expect(got[0]).toContain('queen takes d7');
  });

  it('an audit never synthesises', async () => {
    const svc = await load();
    vi.spyOn(svc, 'isAuditMuted').mockReturnValue(true);
    const f = vi.spyOn(svc, 'fetchClipToCache');
    await svc.prefetchAudio(['anything at all']);
    expect(f).not.toHaveBeenCalled();
  });
});
