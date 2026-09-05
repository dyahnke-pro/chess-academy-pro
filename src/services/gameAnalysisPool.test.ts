// The review's eval curve, run across a worker pool.
//
// 🔒 WHY THIS EXISTS. The single-game review — the one with a person watching a
// progress bar — evaluated its ~66 positions ONE AT A TIME through the
// singleton engine. The worker pool was built, but only the batch sweep used
// it, and the batch is the path nobody waits on.
//
// Worse, the pool hardcoded `/stockfish/stockfish-18-lite-single.js`: the WASM
// build that `resolveWorkerUrl` deliberately routes iOS AWAY from because it
// `call_indirect`-traps on WebKit. So on every iPhone the pool spawned workers
// that could never signal ready, waited out the timeout, and fell back to
// sequential-on-the-slowest-engine. Measured on David's phone: 216 seconds, and
// 11 of his 14 reviews were abandoned before finishing.
//
// The existing gameAnalysisService tests cannot catch any of this: jsdom has no
// `Worker`, so every one of them silently takes the fallback. This file installs
// a fake Worker so the pooled path actually runs.
//
// THE ORDERING CASE IS THE LOAD-BEARING ONE. Positions are handed out by a work
// QUEUE (a fixed round-robin split leaves one worker grinding a tactical
// middlegame while the rest idle), and a queue returns results out of order by
// nature. If index alignment slips, every eval lands on the wrong move and the
// whole review lies — quietly, with no error anywhere.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The URL the pool must NOT hardcode, and the one iOS actually gets.
const IOS_ASM_URL = '/stockfish/stockfish-asm.js';
const WASM_SINGLE_URL = '/stockfish/stockfish-18-lite-single.js';

const spawnedUrls: string[] = [];

/** Per-fen scripted depth+score, so a mis-ordered result is detectable. */
let scriptFor: (fen: string) => { cp: number; depth: number };
/** Set to make every worker fail to signal ready (the no-pool case). */
let workersNeverReady = false;

class FakeStockfishWorker {
  private listeners: ((e: MessageEvent<string>) => void)[] = [];
  private fen = '';
  onerror: (() => void) | null = null;

  constructor(url: string) {
    spawnedUrls.push(url);
  }

  addEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners.push(fn); }
  removeEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  private emit(line: string): void {
    for (const l of [...this.listeners]) l({ data: line } as MessageEvent<string>);
  }

  postMessage(msg: string): void {
    if (msg === 'isready') {
      if (workersNeverReady) return;
      setTimeout(() => this.emit('readyok'), 0);
      return;
    }
    if (msg.startsWith('position fen ')) {
      this.fen = msg.slice('position fen '.length);
      return;
    }
    if (msg.startsWith('go ')) {
      const { cp, depth } = scriptFor(this.fen);
      // Stagger replies so the queue genuinely interleaves across workers —
      // a deterministic lockstep would hide an ordering bug.
      const jitter = (cp % 3) * 2;
      setTimeout(() => {
        this.emit(`info depth ${depth} score cp ${cp}`);
        this.emit('bestmove e2e4');
      }, jitter);
    }
  }

  terminate(): void { /* no-op */ }
}

describe('the review evaluates its positions in parallel', () => {
  beforeEach(() => {
    spawnedUrls.length = 0;
    workersNeverReady = false;
    scriptFor = () => ({ cp: 0, depth: 16 });
    vi.stubGlobal('Worker', FakeStockfishWorker);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('spawns the build the engine resolved, never the hardcoded WASM one', async () => {
    // THE BUG, IN ONE ASSERTION. `resolveWorkerUrl` is the single owner of
    // "which Stockfish build runs on this device"; the pool must ask it rather
    // than naming a file. Here it reports the iOS asm build — the pool must
    // spawn THAT, not the WASM single that traps on WebKit.
    vi.doMock('./stockfishEngine', () => ({
      stockfishEngine: { initialize: vi.fn(), analyzePosition: vi.fn() },
      isIosSafari: () => false,
      resolveWorkerUrl: () => ({ url: IOS_ASM_URL, variant: 'asm', reason: 'iOS', workerType: 'classic' }),
    }));
    const { __testables } = await import('./gameAnalysisService');
    const out = await __testables.evaluateFensPooled(['8/8/8/8/8/8/8/K6k w - - 0 1']);

    expect(out, 'the pool did not run at all').not.toBeNull();
    expect(spawnedUrls.length).toBeGreaterThan(0);
    for (const u of spawnedUrls) {
      expect(u, 'the pool hardcoded a build instead of asking the engine').toBe(IOS_ASM_URL);
      expect(u).not.toBe(WASM_SINGLE_URL);
    }
  }, 30_000);

  it('returns every eval against the position it belongs to', async () => {
    // The work queue hands positions out as workers free up, so replies arrive
    // out of order. Each fen here scripts a unique score derived from its own
    // index; if alignment slips, the evals come back permuted and every move in
    // the review is judged against somebody else's position.
    vi.doMock('./stockfishEngine', () => ({
      stockfishEngine: { initialize: vi.fn(), analyzePosition: vi.fn() },
      isIosSafari: () => false,
      resolveWorkerUrl: () => ({ url: IOS_ASM_URL, variant: 'asm', reason: 'iOS', workerType: 'classic' }),
    }));
    const fens = Array.from({ length: 25 }, (_, i) => `${i}/8/8/8/8/8/8/K6k w - - 0 1`);
    const scoreOf = (fen: string) => Number(fen.split('/')[0]) * 7 + 1;
    scriptFor = (fen) => ({ cp: scoreOf(fen), depth: 16 });

    const { __testables } = await import('./gameAnalysisService');
    const out = await __testables.evaluateFensPooled(fens);

    expect(out).not.toBeNull();
    expect(out!.evals).toHaveLength(fens.length);
    fens.forEach((fen, i) => {
      expect(out!.evals[i], `eval at index ${i} belongs to another position`).toBe(scoreOf(fen));
    });
  }, 30_000);

  it('reports the SHALLOWEST depth any position reached', async () => {
    // The record is stamped with this. One time-starved position means the
    // game as a whole did not reach full depth, and must stay re-analysable.
    vi.doMock('./stockfishEngine', () => ({
      stockfishEngine: { initialize: vi.fn(), analyzePosition: vi.fn() },
      isIosSafari: () => false,
      resolveWorkerUrl: () => ({ url: IOS_ASM_URL, variant: 'asm', reason: 'iOS', workerType: 'classic' }),
    }));
    const fens = ['a/8/8/8/8/8/8/K6k w - - 0 1', 'b/8/8/8/8/8/8/K6k w - - 0 1', 'c/8/8/8/8/8/8/K6k w - - 0 1'];
    scriptFor = (fen) => ({ cp: 10, depth: fen.startsWith('b') ? 9 : 16 });

    const { __testables } = await import('./gameAnalysisService');
    const out = await __testables.evaluateFensPooled(fens);
    expect(out!.achievedDepth).toBe(9);
  }, 30_000);

  it('reports progress once per position, never more', async () => {
    vi.doMock('./stockfishEngine', () => ({
      stockfishEngine: { initialize: vi.fn(), analyzePosition: vi.fn() },
      isIosSafari: () => false,
      resolveWorkerUrl: () => ({ url: IOS_ASM_URL, variant: 'asm', reason: 'iOS', workerType: 'classic' }),
    }));
    const fens = Array.from({ length: 12 }, (_, i) => `${i}/8/8/8/8/8/8/K6k w - - 0 1`);
    const seen: number[] = [];
    const { __testables } = await import('./gameAnalysisService');
    await __testables.evaluateFensPooled(fens, (cur, total) => {
      expect(total).toBe(fens.length);
      seen.push(cur);
    });
    expect(seen).toHaveLength(fens.length);
    // A queue completes out of order, but every position must be counted once.
    expect([...seen].sort((a, b) => a - b)).toEqual(fens.map((_, i) => i + 1));
  }, 30_000);

  it('gives up on the pool and lets the caller fall back', async () => {
    // No pool must never mean no review — the sequential singleton still runs.
    vi.doMock('./stockfishEngine', () => ({
      stockfishEngine: { initialize: vi.fn(), analyzePosition: vi.fn() },
      isIosSafari: () => false,
      resolveWorkerUrl: () => ({ url: IOS_ASM_URL, variant: 'asm', reason: 'iOS', workerType: 'classic' }),
    }));
    workersNeverReady = true;
    vi.useFakeTimers();
    const { __testables } = await import('./gameAnalysisService');
    const pending = __testables.evaluateFensPooled(['8/8/8/8/8/8/8/K6k w - - 0 1']);
    await vi.advanceTimersByTimeAsync(__testables.POOL_SPAWN_TIMEOUT_MS + 100);
    await expect(pending).resolves.toBeNull();
    vi.useRealTimers();
  }, 30_000);

  it('the BATCH path budgets its search too, so a slow build cannot null out a library', async () => {
    // 🔒 THE REGRESSION THE POOL FIX ALMOST SHIPPED. Making the pool resolve the
    // build per device means it now RUNS on iOS, where the engine is asm.js.
    // The batch path asked for an uncapped `go depth 16` against
    // analyzePosition's hard 10s reject, which asm does not meet on a complex
    // position — and a rejected position pushes a null eval, a null pair
    // classifies as `good`, and the game is written back `fullyAnalyzed`.
    // Silently marking a chunk of the user's library fine, permanently.
    //
    // Asserted at the wire: every `go` the batch sends must carry a movetime.
    const gos: string[] = [];
    class RecordingWorker extends FakeStockfishWorker {
      postMessage(msg: string): void {
        if (msg.startsWith('go ')) gos.push(msg);
        super.postMessage(msg);
      }
    }
    vi.stubGlobal('Worker', RecordingWorker);
    vi.doMock('./stockfishEngine', () => ({
      stockfishEngine: { initialize: vi.fn(), analyzePosition: vi.fn() },
      isIosSafari: () => false,
      resolveWorkerUrl: () => ({ url: IOS_ASM_URL, variant: 'asm', reason: 'iOS', workerType: 'classic' }),
    }));
    const { __testables } = await import('./gameAnalysisService');
    await __testables.evaluateFensPooled(['8/8/8/8/8/8/8/K6k w - - 0 1', '8/8/8/8/8/8/8/K6k b - - 0 1']);

    expect(gos.length).toBeGreaterThan(0);
    for (const g of gos) {
      expect(g, `an uncapped search would reject on a slow build: "${g}"`).toMatch(/movetime \d+/);
    }
  }, 30_000);

  it('waits seconds for the pool, not the 45s engine-init budget', async () => {
    // The pool is an OPTIMISATION. Spending the full engine init timeout to
    // discover it cannot spawn adds that dead time to the front of every
    // review on every device where the pool fails — which, before the URL fix,
    // was every iPhone.
    const { __testables } = await import('./gameAnalysisService');
    expect(__testables.POOL_SPAWN_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  }, 30_000);
});
