/**
 * A SILENT single-thread worker is replaced once, not waited out for 45s
 * (PostHog 2026-09-23: "initialization timed out after 45s (last stage: none —
 * worker never signaled)" on variant=single). A worker that has said anything
 * is alive and must be left to finish.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({}),
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web', isPluginAvailable: () => false },
}));

interface FakeWorkerLike { url: string; terminated: boolean; answer: boolean }
const workers: FakeWorkerLike[] = [];
/** Which spawned workers will answer the UCI handshake (by spawn index). */
let answering: (index: number) => boolean = () => true;

class FakeWorker {
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  private listeners: Array<(e: MessageEvent<string>) => void> = [];
  readonly rec: FakeWorkerLike;
  constructor(url: string) {
    this.rec = { url, terminated: false, answer: answering(workers.length) };
    workers.push(this.rec);
  }
  addEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners.push(fn); }
  removeEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners = this.listeners.filter((l) => l !== fn); }
  private emit(line: string): void {
    const e = { data: line } as MessageEvent<string>;
    this.onmessage?.(e);
    for (const l of [...this.listeners]) l(e);
  }
  postMessage(cmd: string): void {
    if (!this.rec.answer || this.rec.terminated) return;
    if (cmd === 'uci') setTimeout(() => this.emit('uciok'), 10);
    if (cmd === 'isready') setTimeout(() => this.emit('readyok'), 10);
  }
  terminate(): void { this.rec.terminated = true; }
}

async function freshEngine() {
  vi.resetModules();
  const mod = await import('./stockfishEngine');
  return mod.stockfishEngine;
}

describe('single-thread worker that never signals', () => {
  beforeEach(() => {
    workers.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('replaces a SILENT worker once at 15s and becomes ready — instead of waiting 45s', async () => {
    answering = (i) => i > 0; // the first worker is dead, the replacement answers
    const engine = await freshEngine();
    const ready = engine.initialize();
    await vi.advanceTimersByTimeAsync(14_000);
    expect(workers).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_000);
    await ready;
    expect(workers).toHaveLength(2);
    expect(workers[0].terminated).toBe(true);
    expect(workers[0].url).toMatch(/single/);
    expect(engine.status).toBe('ready');
  });

  it('leaves a worker that is ALIVE alone, however slow', async () => {
    answering = () => true;
    const engine = await freshEngine();
    const ready = engine.initialize();
    await vi.advanceTimersByTimeAsync(20_000);
    await ready;
    expect(engine.status).toBe('ready');
    expect(workers).toHaveLength(1);
    expect(workers[0].terminated).toBe(false);
  });

  it('replaces at most once — a host that cannot run it still reaches its verdict', async () => {
    answering = () => false;
    const engine = await freshEngine();
    const ready = engine.initialize().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(46_000);
    const outcome = await ready;
    expect(outcome).toBeInstanceOf(Error);
    expect(workers).toHaveLength(2);
  });
});
