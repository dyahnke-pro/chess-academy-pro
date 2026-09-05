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

/** Every fake spawned this test — so a test can kill one (`dead = true`). */
const instances: FakeStockfishWorker[] = [];
let terminated = 0;

class FakeStockfishWorker {
  private listeners: ((e: MessageEvent<string>) => void)[] = [];
  private fen = '';
  onerror: (() => void) | null = null;
  /** A worker iOS killed while backgrounded: posts nothing, ever. */
  dead = false;

  constructor(url: string) {
    spawnedUrls.push(url);
    instances.push(this);
  }

  addEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners.push(fn); }
  removeEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  private emit(line: string): void {
    for (const l of [...this.listeners]) l({ data: line } as MessageEvent<string>);
  }

  postMessage(msg: string): void {
    if (this.dead) return;
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

  terminate(): void { terminated += 1; }
}

describe('the review evaluates its positions in parallel', () => {
  beforeEach(() => {
    spawnedUrls.length = 0;
    instances.length = 0;
    terminated = 0;
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
    try {
      const { __testables } = await import('./gameAnalysisService');
      const pending = __testables.evaluateFensPooled(['8/8/8/8/8/8/8/K6k w - - 0 1']);
      // The mock resolves the asm build, which (correctly) gets its full
      // cold-compile budget before the pool gives up — advance past THAT, not
      // the short WASM gate. Fake timers make the 45s instant.
      await vi.advanceTimersByTimeAsync(__testables.ASM_POOL_SPAWN_TIMEOUT_MS + 100);
      await expect(pending).resolves.toBeNull();
    } finally {
      // Always restore — a failure here with fake timers left on freezes every
      // later test's fake worker (their readyok/bestmove ride on setTimeout).
      vi.useRealTimers();
    }
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

  it('but gives the asm.js build its FULL cold-compile budget to reach readyok', async () => {
    // 🚨 THE 2026-09-05 REGRESSION (David: "still spinning on 1/50"). The short
    // gate above is right for fast WASM builds, but asm.js must cold-compile
    // 1.58MB before it can say `readyok` — up to ~45s on a phone. Under the 8s
    // gate the asm pool NEVER became ready: every spawn timed out, the pool
    // "failed" (console-only), and the sweep fell to the sequential singleton
    // that wedges (native) or grinds at 5s/position (web). Both = stuck at 1.
    // asm must wait the engine's full init budget; failing fast into a broken
    // fallback is not a fast path, it is the bug.
    const { __testables } = await import('./gameAnalysisService');
    expect(__testables.ASM_POOL_SPAWN_TIMEOUT_MS).toBeGreaterThanOrEqual(40_000);
    expect(__testables.ASM_POOL_SPAWN_TIMEOUT_MS).toBeGreaterThan(__testables.POOL_SPAWN_TIMEOUT_MS);
  }, 30_000);
});

// ─── The WARM pool (David 2026-09-05: "get those parallel computers warming up
// at app launch"). On a phone each asm.js worker cold-compiles ~45s; paying that
// in front of every Analyze tap — and then TERMINATING the workers at the end so
// the next tap paid it again — was most of the wait. The pool is now spawned at
// boot and kept alive between runs.
describe('the analysis pool is warmed at launch and kept alive', () => {
  const ENGINE_MOCK = () => ({
    stockfishEngine: { initialize: vi.fn(), analyzePosition: vi.fn() },
    isIosSafari: () => false,
    resolveWorkerUrl: () => ({ url: IOS_ASM_URL, variant: 'asm', reason: 'iOS', workerType: 'classic' }),
  });

  beforeEach(() => {
    spawnedUrls.length = 0;
    instances.length = 0;
    terminated = 0;
    workersNeverReady = false;
    scriptFor = () => ({ cp: 0, depth: 16 });
    vi.stubGlobal('Worker', FakeStockfishWorker);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('warmAnalysisPool spawns the whole pool up front, and a review then spawns NOTHING new', async () => {
    vi.doMock('./stockfishEngine', ENGINE_MOCK);
    const { warmAnalysisPool, __testables } = await import('./gameAnalysisService');
    const warm = await warmAnalysisPool();
    expect(warm).toBe(__testables.WORKER_POOL_SIZE);
    expect(spawnedUrls).toHaveLength(__testables.WORKER_POOL_SIZE);
    // Idempotent — a second warm is free.
    expect(await warmAnalysisPool()).toBe(warm);
    expect(spawnedUrls).toHaveLength(__testables.WORKER_POOL_SIZE);

    const fens = ['8/8/8/8/8/8/8/K6k w - - 0 1', '8/8/8/8/8/8/8/K6k b - - 0 1', '7k/8/8/8/8/8/8/K7 w - - 0 1'];
    const out = await __testables.evaluateFensPooled(fens);
    expect(out).not.toBeNull();
    expect(out!.evals.every((e) => e !== null)).toBe(true);
    // The review ran on the WARM workers — no new Worker was constructed.
    expect(spawnedUrls).toHaveLength(__testables.WORKER_POOL_SIZE);
  }, 30_000);

  it('keeps the workers alive after a run so the next one is instant (no terminate, no respawn)', async () => {
    vi.doMock('./stockfishEngine', ENGINE_MOCK);
    const { __testables } = await import('./gameAnalysisService');
    const fens = ['8/8/8/8/8/8/8/K6k w - - 0 1', '8/8/8/8/8/8/8/K6k b - - 0 1'];
    await __testables.evaluateFensPooled(fens);
    const afterFirst = spawnedUrls.length;
    expect(afterFirst).toBeGreaterThan(0);
    expect(terminated, 'the pool used to terminate every worker at the end of a run').toBe(0);

    await __testables.evaluateFensPooled(fens);
    expect(spawnedUrls.length, 'second run must reuse the warm workers').toBe(afterFirst);
    expect(terminated).toBe(0);
  }, 30_000);

  it('drops a warm worker that stopped answering and replaces it, without losing a single eval', async () => {
    vi.doMock('./stockfishEngine', ENGINE_MOCK);
    const { warmAnalysisPool, __testables } = await import('./gameAnalysisService');
    await warmAnalysisPool();
    const warmCount = spawnedUrls.length;
    // iOS killed one while the app was backgrounded: it never answers again.
    instances[0].dead = true;

    const fens = ['8/8/8/8/8/8/8/K6k w - - 0 1', '8/8/8/8/8/8/8/K6k b - - 0 1', '7k/8/8/8/8/8/8/K7 w - - 0 1'];
    const out = await __testables.evaluateFensPooled(fens);
    expect(out).not.toBeNull();
    expect(out!.evals.every((e) => e !== null), 'a dead worker must not null out its positions').toBe(true);
    expect(terminated, 'the dead worker is destroyed').toBeGreaterThanOrEqual(1);
    expect(spawnedUrls.length, 'exactly one replacement spawned').toBe(warmCount + 1);
  }, 30_000);

  it('resetAnalysisPool (test hook) destroys every warm worker', async () => {
    vi.doMock('./stockfishEngine', ENGINE_MOCK);
    const { warmAnalysisPool, __testables } = await import('./gameAnalysisService');
    const n = await warmAnalysisPool();
    __testables.resetAnalysisPool();
    expect(terminated).toBe(n);
  }, 30_000);
});
