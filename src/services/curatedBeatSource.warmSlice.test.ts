import { describe, it, expect, vi } from 'vitest';

// 🔒 THE BOOT BLOCK (2026-09-29). The curated-beat index warmed in chunks of
// 200 beats — ~265 ms of unbroken chess.js on a desktop, over a second at phone
// speed, on every launch. It now yields on a TIME budget. This measures the
// longest stretch the warm-up holds the thread between two yields.
describe('warmCuratedBeatIndex yields on a time budget', () => {
  it('never holds the thread for long between yields, and still builds the whole index', { timeout: 120000 }, async () => {
    vi.resetModules();
    const src = await import('./curatedBeatSource');
    const realSetTimeout = globalThis.setTimeout;
    const gaps: number[] = [];
    let last = performance.now();
    const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      const t = performance.now();
      if (!ms) { gaps.push(t - last); }
      return realSetTimeout(() => { last = performance.now(); fn(); }, ms);
    }) as typeof setTimeout);
    await src.warmCuratedBeatIndex();
    spy.mockRestore();

    expect(src.curatedBeatStats().built).toBe(true);
    // The old 200-beat chunking yielded ~19 times with ~265 ms chunks. A time
    // budget yields hundreds of times. The median is asserted rather than the
    // worst gap: one gap can be stretched by GC or a loaded CPU, the median
    // cannot be moved by a single stall.
    expect(gaps.length).toBeGreaterThan(100);
    const sorted = [...gaps].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThan(30);
  });
});
