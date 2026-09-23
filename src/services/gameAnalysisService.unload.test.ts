// 🔒 #21 (2026-09-20): `destroyAllAnalysisWorkers` terminates EVERY analysis
// worker — warm and leased — so a `pagehide` frees their WASM heaps before the
// next document's engines allocate. The pool's own `releasePool` only ever sees
// warm workers, which is why a leased dive/fan worker was untouchable before.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const spawned: FakeWorker[] = [];
let terminated = 0;
class FakeWorker {
  private listeners: ((e: MessageEvent<string>) => void)[] = [];
  onerror: (() => void) | null = null;
  constructor(_url: string) { spawned.push(this); }
  addEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners.push(fn); }
  removeEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners = this.listeners.filter((l) => l !== fn); }
  private emit(line: string): void { for (const l of [...this.listeners]) l({ data: line } as MessageEvent<string>); }
  postMessage(msg: string): void {
    if (msg === 'uci') setTimeout(() => this.emit('uciok'), 0);
    if (msg === 'isready') setTimeout(() => this.emit('readyok'), 0);
  }
  terminate(): void { terminated += 1; }
}

describe('destroyAllAnalysisWorkers — every worker dies with the document', () => {
  beforeEach(() => {
    spawned.length = 0;
    terminated = 0;
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('navigator', { hardwareConcurrency: 4 });
    vi.resetModules();
  });

  it('terminates the warm pool AND a leased worker, reports the count, and leaves the pool cold', async () => {
    const m = await import('./gameAnalysisService');
    m.__testables.resetAnalysisPool();
    const warm = await m.warmAnalysisPool();
    expect(warm).toBeGreaterThan(0);
    // Lease one out of the pool — the shape the dive and the critical fan use.
    const lease = await m.acquirePvEngines(1);
    expect(lease).not.toBeNull();
    const before = spawned.length;
    const n = m.destroyAllAnalysisWorkers();
    expect(n).toBe(before);              // warm + leased, every one of them
    expect(terminated).toBe(before);     // and each was actually terminate()d
    // Cold afterwards: releasing the old lease must not resurrect anything.
    lease!.release();
    expect(await m.warmAnalysisPool()).toBeGreaterThan(0); // fresh spawns, not the dead ones
    expect(spawned.length).toBeGreaterThan(before);
  // 30s, not the 5s default: after `resetModules` the first dynamic import
  // re-transforms the whole coach service graph (~7-8s measured 2026-09-23),
  // so the default timed out before a single assertion ran.
  }, 30_000);

  it('negative control: with nothing spawned it tears down nothing and does not throw', async () => {
    const m = await import('./gameAnalysisService');
    m.__testables.resetAnalysisPool();
    expect(m.destroyAllAnalysisWorkers()).toBe(0);
    expect(terminated).toBe(0);
  });
});
