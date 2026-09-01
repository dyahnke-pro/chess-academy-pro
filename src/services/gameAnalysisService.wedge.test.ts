import { describe, it, expect, vi } from 'vitest';
import { analyzeGameOnWorker, WorkerWedgedError } from './gameAnalysisService';
import { buildGameRecord } from '../test/factories';

// R1 (David 2026-09-01) — "analysis stalls at 1/629, Stop works but the loop
// doesn't advance." A worker iOS killed keeps timing out on every position, so a
// whole game (and every game after it) grinds through the full reject. The pool
// now bails with WorkerWedgedError after 3 CONSECUTIVE position timeouts so the
// batch recycles the dead worker instead of freezing. These tests pin that the
// wedge fires on 3-in-a-row timeouts and NOT on scattered ones.

const GAME = buildGameRecord({ pgn: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 1-0' });

/** A fake DedicatedWorker: `analyzePosition` runs the supplied per-call script. */
function fakeWorker(script: () => Promise<{ evaluation: number; bestMove: string; depth: number }>) {
  return { analyzePosition: vi.fn(script), destroy: vi.fn() } as never;
}

const timeout = () => Promise.reject(new Error('Analysis timed out'));
const ok = () => Promise.resolve({ evaluation: 20, bestMove: 'e2e4', depth: 16 });

describe('analyzeGameOnWorker — wedged-worker guard (R1)', () => {
  it('throws WorkerWedgedError after 3 consecutive position timeouts', async () => {
    const worker = fakeWorker(timeout);
    await expect(analyzeGameOnWorker(GAME, worker)).rejects.toBeInstanceOf(WorkerWedgedError);
  });

  it('does NOT wedge on scattered (non-consecutive) timeouts', async () => {
    // ok, timeout, ok, timeout, ok, … — the counter resets on every success, so
    // it never reaches 3 in a row. Should complete (never throw).
    let i = 0;
    const worker = fakeWorker(() => (i++ % 2 === 1 ? timeout() : ok()));
    const result = await analyzeGameOnWorker(GAME, worker);
    expect(result).not.toBeNull();
    expect(result!.annotations.length).toBeGreaterThan(0);
  });

  it('does NOT wedge when a non-timeout error is thrown repeatedly', async () => {
    // A "Worker is dead" (post-message throw) is a different failure — the wedge
    // counter only trips on the budget-timeout reject, so this completes.
    const worker = fakeWorker(() => Promise.reject(new Error('Worker is dead')));
    const result = await analyzeGameOnWorker(GAME, worker);
    expect(result).not.toBeNull();
  });

  it('completes normally when the worker answers every position', async () => {
    const worker = fakeWorker(ok);
    const result = await analyzeGameOnWorker(GAME, worker);
    expect(result).not.toBeNull();
    expect(result!.annotations.length).toBeGreaterThan(0);
  });
});
