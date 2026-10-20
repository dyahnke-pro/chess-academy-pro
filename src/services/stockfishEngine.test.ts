import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { stockfishCache } from './stockfishCache';
import type { StockfishAnalysis } from '../types';

// Mutable Capacitor platform stub. Defaults ('web', non-native, no plugin)
// match what the REAL @capacitor/core returns in the vitest env, so every
// existing test is behavior-preserved; the native-iOS routing tests flip
// `capacitorState.platform = 'ios'` to exercise the UA-independent iOS path.
const capacitorState = vi.hoisted(() => ({
  platform: 'web' as string,
  native: false,
  pluginAvailable: false,
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: (): string => capacitorState.platform,
    isNativePlatform: (): boolean => capacitorState.native,
    isPluginAvailable: (): boolean => capacitorState.pluginAvailable,
  },
  // capacitor-stockfish-native calls registerPlugin at import — stub it so the
  // module graph loads (returns an inert proxy; the native path is gated off by
  // isPluginAvailable() === false above).
  registerPlugin: (): Record<string, never> => ({}),
}));

// Controllable stub for the native iOS Stockfish plugin (the `ios-native`
// variant's transport). Inert by default — `capacitorState.pluginAvailable`
// is false, so the engine never picks ios-native — and driven directly by the
// runtime-stall regression test below, which needs a native engine that INITS
// cleanly and then goes silent.
const nativeState = vi.hoisted(() => ({
  emit: null as ((line: string) => void) | null,
  cmds: [] as string[],
  starts: 0,
  exits: 0,
}));
vi.mock('capacitor-stockfish-native', () => ({
  StockfishNative: {
    addListener: (_event: string, cb: (data: { line: string }) => void) => {
      nativeState.emit = (line: string): void => cb({ line });
      return Promise.resolve({ remove: (): Promise<void> => Promise.resolve() });
    },
    start: (): Promise<void> => {
      nativeState.starts += 1;
      return Promise.resolve();
    },
    cmd: ({ cmd }: { cmd: string }): Promise<void> => {
      nativeState.cmds.push(cmd);
      return Promise.resolve();
    },
    exit: (): Promise<void> => {
      nativeState.exits += 1;
      return Promise.resolve();
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock Worker infrastructure
// ---------------------------------------------------------------------------

type MessageListener = (event: MessageEvent) => void;

interface MockWorkerHandle {
  instance: Worker;
  emit: (data: string) => void;
  emitError: (message: string) => void;
  postMessageCalls: string[];
}

/**
 * Creates a mock Worker that simulates UCI protocol responses.
 * Supports both onmessage and addEventListener patterns.
 */
function createMockWorker(): MockWorkerHandle {
  const messageListeners: MessageListener[] = [];
  const postMessageCalls: string[] = [];

  const worker = {
    postMessage: vi.fn((msg: string) => {
      postMessageCalls.push(msg);
    }),
    terminate: vi.fn(),
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message') {
        messageListeners.push(listener as MessageListener);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message') {
        const idx = messageListeners.indexOf(listener as MessageListener);
        if (idx >= 0) messageListeners.splice(idx, 1);
      }
    }),
    dispatchEvent: vi.fn(() => true),
  } as unknown as Worker;

  function emit(data: string): void {
    const event = { data } as MessageEvent<string>;
    if (worker.onmessage) {
      worker.onmessage(event);
    }
    for (const listener of [...messageListeners]) {
      listener(event);
    }
  }

  function emitError(message: string): void {
    const event = { message } as ErrorEvent;
    if (worker.onerror) {
      worker.onerror(event);
    }
  }

  return { instance: worker, emit, emitError, postMessageCalls };
}

// ---------------------------------------------------------------------------
// Shared mock state — set in beforeEach, used by the Worker class stub
// ---------------------------------------------------------------------------

let mockWorker: MockWorkerHandle;
let workerConstructorCallCount: number;
/** Every URL `new Worker(...)` was called with, in order — lets a test prove
 *  WHICH engine bundle a fallback actually routed to. */
let workerConstructorUrls: string[];

// Stub the global Worker as a class that can be called with `new`
beforeEach(() => {
  mockWorker = createMockWorker();
  workerConstructorCallCount = 0;
  workerConstructorUrls = [];
  nativeState.emit = null;
  nativeState.cmds.length = 0;
  nativeState.starts = 0;
  nativeState.exits = 0;
  // The engine populates a module-level FEN cache on bestmove. Clear
  // it between tests so a previous test's analysis result doesn't
  // short-circuit the worker dispatch under test.
  stockfishCache.clear();
  // Clear the persisted multi-thread fallback flag so each test
  // starts from a clean slate — a previous test that wrote the flag
  // would otherwise force every subsequent test straight to single.
  try {
    localStorage.removeItem('sfx.multi-fallback-attempted.v1');
  } catch {
    /* no localStorage in some test envs */
  }

  // Use a class so `new Worker(...)` works properly
  vi.stubGlobal(
    'Worker',
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class MockWorkerClass {
      constructor(url?: string | URL) {
        workerConstructorCallCount++;
        workerConstructorUrls.push(String(url ?? ''));
        // Return the shared mock instance instead of `this`
        return mockWorker.instance as unknown as MockWorkerClass;
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helper: get a fresh engine singleton per test
// ---------------------------------------------------------------------------

async function getEngine(): Promise<{
  stockfishEngine: (typeof import('./stockfishEngine'))['stockfishEngine'];
}> {
  vi.resetModules();
  const mod = await import('./stockfishEngine');
  return { stockfishEngine: mod.stockfishEngine };
}

async function getEngineModule(): Promise<typeof import('./stockfishEngine')> {
  vi.resetModules();
  return import('./stockfishEngine');
}

// ---------------------------------------------------------------------------
// Helper: complete init handshake
// ---------------------------------------------------------------------------

function completeInit(): void {
  queueMicrotask(() => {
    // New init protocol: engine waits for `uciok` before sending
    // setoptions + `isready`. Drive both events from the mock.
    mockWorker.emit('uciok');
    queueMicrotask(() => {
      mockWorker.emit('readyok');
    });
  });
}

async function initEngine(engine: {
  initialize: () => Promise<void>;
}): Promise<void> {
  completeInit();
  await engine.initialize();
}

// ---------------------------------------------------------------------------
// Helper: emit canned analysis data
// ---------------------------------------------------------------------------

/** The board the engine was last told about — the canned lines are moves ON
 *  it, the way a real engine's are (a read ignores lines for another board). */
function lastPositionFen(): string {
  const p = [...mockWorker.postMessageCalls].reverse().find((m) => m.startsWith('position fen '));
  return p ? p.slice('position fen '.length) : START_FEN_FOR_MOCK;
}
const START_FEN_FOR_MOCK = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function legalUcis(fen: string, n: number): string[] {
  try {
    return new Chess(fen).moves({ verbose: true }).slice(0, n).map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
  } catch {
    return [];
  }
}

function emitAnalysisResponse(options?: {
  mateScore?: { value: number; multipv?: number };
  lines?: Array<{ multipv: number; cp: number; pv: string }>;
  bestmove?: string;
}): void {
  const fen = lastPositionFen();
  const fromStart = fen === START_FEN_FOR_MOCK;
  const own = fromStart ? [] : legalUcis(fen, 3);
  const bestmove = options?.bestmove ?? (fromStart ? 'e2e4 ponder e7e5' : own[0] ?? '(none)');

  if (options?.mateScore) {
    const mv = options.mateScore.multipv ?? 1;
    mockWorker.emit(
      `info depth 15 multipv ${mv} score mate ${options.mateScore.value} pv ${fromStart ? 'e2e4 e7e5 d1h5' : own[0]}`,
    );
  }

  if (options?.lines) {
    for (const line of options.lines) {
      mockWorker.emit(
        `info depth 18 multipv ${line.multipv} score cp ${line.cp} pv ${line.pv}`,
      );
    }
  } else if (!options?.mateScore) {
    if (fromStart) {
      mockWorker.emit(
        'info depth 18 multipv 1 score cp 30 pv e2e4 e7e5 g1f3 b8c6',
      );
      mockWorker.emit(
        'info depth 18 multipv 2 score cp 20 pv d2d4 d7d5 c2c4',
      );
      mockWorker.emit(
        'info depth 18 multipv 3 score cp 10 pv c2c4 e7e5 b1c3',
      );
    } else {
      own.forEach((uci, i) => mockWorker.emit(`info depth 18 multipv ${i + 1} score cp ${30 - i * 10} pv ${uci}`));
    }
  }

  mockWorker.emit(`bestmove ${bestmove}`);
}

/**
 * Hooks into postMessage so that:
 *  - "isready" triggers a deferred "readyok"
 *  - "go ..." triggers deferred analysis info lines + bestmove
 */
function scheduleAnalysisResponse(
  options?: Parameters<typeof emitAnalysisResponse>[0],
): void {
  const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
  pmMock.mockImplementation((msg: string) => {
    mockWorker.postMessageCalls.push(msg);
    if (msg === 'isready') {
      queueMicrotask(() => mockWorker.emit('readyok'));
    }
    if (msg.startsWith('go ')) {
      queueMicrotask(() => emitAnalysisResponse(options));
    }
  });
}

// =========================================================================
// Tests
// =========================================================================

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('StockfishEngine', () => {
  // -----------------------------------------------------------------------
  // initialize
  // -----------------------------------------------------------------------
  describe('initialize', () => {
    it('sends uci and isready commands', async () => {
      const { stockfishEngine } = await getEngine();
      completeInit();
      await stockfishEngine.initialize();

      expect(mockWorker.postMessageCalls).toContain('uci');
      expect(mockWorker.postMessageCalls).toContain('isready');
    });

    it('resolves after readyok is received', async () => {
      const { stockfishEngine } = await getEngine();
      let resolved = false;

      const promise = stockfishEngine.initialize().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      // New init protocol: emit uciok first so the engine sends
      // setoptions + isready, then emit readyok.
      mockWorker.emit('uciok');
      mockWorker.emit('readyok');
      await promise;

      expect(resolved).toBe(true);
    });

    it('sets MultiPV option to 3 after readyok', async () => {
      const { stockfishEngine } = await getEngine();
      completeInit();
      await stockfishEngine.initialize();

      expect(mockWorker.postMessageCalls).toContain(
        'setoption name MultiPV value 3',
      );
    });

    it('is idempotent — second call returns same promise without creating another worker', async () => {
      const { stockfishEngine } = await getEngine();
      completeInit();

      const p1 = stockfishEngine.initialize();
      const p2 = stockfishEngine.initialize();
      await p1;
      await p2;

      // Only one Worker was created
      expect(workerConstructorCallCount).toBe(1);
    });

    it('creates a Worker instance', async () => {
      const { stockfishEngine } = await getEngine();
      completeInit();
      await stockfishEngine.initialize();

      expect(workerConstructorCallCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // analyzePosition
  // -----------------------------------------------------------------------
  describe('analyzePosition', () => {
    it('sends correct UCI position command', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN, 20);

      expect(mockWorker.postMessageCalls).toContain(
        `position fen ${STARTING_FEN}`,
      );
    });

    it('sends go depth command with specified depth', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN, 20);

      expect(mockWorker.postMessageCalls).toContain('go depth 20 movetime 8000');
    });

    it('uses default depth 18 when not specified', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(mockWorker.postMessageCalls).toContain('go depth 18 movetime 8000');
    });

    // David 2026-07-24: the adaptive opponent lowers `Skill Level` (persists in
    // the shared worker) — a full-strength analysis MUST reset it to 20 so the
    // eval bar / hint / live-punishment detector see the TRUE best line.
    it('normalizes Skill Level to 20 when no options are given', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN, 12);

      expect(mockWorker.postMessageCalls).toContain('setoption name Skill Level value 20');
    });

    it('honors an explicit low Skill Level (adaptive opponent) and does NOT reset to 20', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN, 12, { 'Skill Level': 5 });

      expect(mockWorker.postMessageCalls).toContain('setoption name Skill Level value 5');
      expect(mockWorker.postMessageCalls).not.toContain('setoption name Skill Level value 20');
    });

    // The adaptive opponent's depth-search fallback arms UCI_LimitStrength
    // (2026-10-04). A plain analysis right after must switch it OFF again, or
    // the eval bar / hints would read a capped engine.
    it('switches UCI_LimitStrength off when the caller did not ask for a cap', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN, 12, { 'Skill Level': 20, UCI_LimitStrength: 'true', UCI_Elo: 1500 });
      expect(mockWorker.postMessageCalls).toContain('setoption name UCI_LimitStrength value true');
      expect(mockWorker.postMessageCalls).toContain('setoption name UCI_Elo value 1500');

      mockWorker.postMessageCalls.length = 0;
      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition('8/8/8/8/8/8/8/K6k w - - 0 1', 12);
      expect(mockWorker.postMessageCalls).toContain('setoption name UCI_LimitStrength value false');
    });

    // SEARCH_BUDGET_MS (2026-07-11 stall root-fix): slow single-threaded
    // variants get a movetime bound alongside depth (the search runs inside
    // the worker's event loop, so `stop` can never interrupt it — movetime is
    // enforced inside the engine and bounds latency by construction); fast
    // variants keep pure depth. Empirically verified on the shipped asm build:
    // `go depth 99 movetime 1500` → bestmove in 1537ms.
    it('asm variant gets the 2s movetime budget (iOS engine reads, 2026-10-20: 5 s a read was 40 s a Learn turn)', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      (stockfishEngine as unknown as { workerVariant: string }).workerVariant = 'asm';

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN, 18);

      expect(mockWorker.postMessageCalls).toContain('go depth 18 movetime 2000');
    });

    it('fast variants (multi / ios-native) keep an unbounded pure-depth search', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      (stockfishEngine as unknown as { workerVariant: string }).workerVariant = 'multi';

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN, 18);

      expect(mockWorker.postMessageCalls).toContain('go depth 18');
      expect(mockWorker.postMessageCalls.some((c) => c.includes('movetime'))).toBe(false);
    });

    it('parses multipv info lines into topLines array', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        lines: [
          { multipv: 1, cp: 30, pv: 'e2e4 e7e5 g1f3' },
          { multipv: 2, cp: 20, pv: 'd2d4 d7d5' },
          { multipv: 3, cp: 10, pv: 'c2c4 e7e5' },
        ],
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.topLines).toHaveLength(3);
      expect(analysis.topLines[0].evaluation).toBe(30);
      expect(analysis.topLines[1].evaluation).toBe(20);
      expect(analysis.topLines[2].evaluation).toBe(10);
    });

    it('lines are sorted by multipv rank', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        lines: [
          { multipv: 3, cp: 10, pv: 'c2c4 e7e5' },
          { multipv: 1, cp: 30, pv: 'e2e4 e7e5' },
          { multipv: 2, cp: 20, pv: 'd2d4 d7d5' },
        ],
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.topLines[0].rank).toBe(1);
      expect(analysis.topLines[1].rank).toBe(2);
      expect(analysis.topLines[2].rank).toBe(3);
    });

    it('extracts bestMove from bestmove response', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({ bestmove: 'g1f3 ponder d7d5' });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.bestMove).toBe('g1f3');
    });

    it('parses moves array from pv string', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        lines: [
          { multipv: 1, cp: 30, pv: 'e2e4 e7e5 g1f3 b8c6 f1b5' },
        ],
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.topLines[0].moves).toEqual([
        'e2e4',
        'e7e5',
        'g1f3',
        'b8c6',
        'f1b5',
      ]);
    });

    it('sets evaluation from the primary line', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        lines: [{ multipv: 1, cp: 55, pv: 'e2e4 e7e5' }],
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.evaluation).toBe(55);
    });

    it('sets depth from the info lines', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.depth).toBe(18);
    });

    it('sets nodesPerSecond to 0', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.nodesPerSecond).toBe(0);
    });

    it('sends ucinewgame ONCE at init, not per analysis (warm transposition table)', async () => {
      // David 2026-07-03: ucinewgame clears Stockfish's transposition table, so
      // sending it before every analysis forced a cold search each move. It is
      // now sent once during init; per-analysis dispatch only sends
      // position/go, keeping the table warm so consecutive positions reuse the
      // prior search tree.
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      // Init emitted exactly one ucinewgame.
      const afterInitCount = mockWorker.postMessageCalls.filter(
        (c) => c === 'ucinewgame',
      ).length;
      expect(afterInitCount).toBe(1);

      // Two analyses back-to-back must NOT add more ucinewgame commands.
      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN);
      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN);

      const totalUcinewgame = mockWorker.postMessageCalls.filter(
        (c) => c === 'ucinewgame',
      ).length;
      expect(totalUcinewgame).toBe(1);

      // The position command is still issued for the analysis.
      expect(
        mockWorker.postMessageCalls.includes(`position fen ${STARTING_FEN}`),
      ).toBe(true);
    });

    it('newGame() sends a fresh ucinewgame to clear the table between games', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      const before = mockWorker.postMessageCalls.filter(
        (c) => c === 'ucinewgame',
      ).length;

      stockfishEngine.newGame();

      const after = mockWorker.postMessageCalls.filter(
        (c) => c === 'ucinewgame',
      ).length;
      expect(after).toBe(before + 1);
    });
  });

  // -----------------------------------------------------------------------
  // Stuck-analysis recovery (David 2026-06-16 "Learn with coach freezes")
  //
  // The freeze: iOS suspends/kills the worker while backgrounded, or it
  // crashes mid-search without firing onerror. It then accepts UCI but
  // NEVER emits `bestmove`, so the analyze promise used to hang forever —
  // freezing every awaiting caller (the grounded coach answer). The engine
  // now hard-recovers: rejects the caller and resets the dead worker.
  // -----------------------------------------------------------------------
  describe('stuck-analysis recovery', () => {
    // Worker that completes the handshake (answers `isready`) but goes
    // silent on `go` — never returns `bestmove`. The dead-worker freeze.
    function scheduleReadyButNoBestmove(): void {
      const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        // Complete the UCI handshake so a RESPAWNED worker (after a
        // forceRestart self-heal) finishes init — it just stays silent on
        // `go`, modelling a fresh-but-still-dead worker.
        if (msg === 'uci') {
          queueMicrotask(() => mockWorker.emit('uciok'));
        }
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
        // 'go ...' deliberately produces NO bestmove.
      });
    }

    it('rejects analyzePosition (and does not hang) when no bestmove arrives', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      scheduleReadyButNoBestmove();

      vi.useFakeTimers();
      const p = stockfishEngine.analyzePosition(STARTING_FEN, 18);
      // Attach the rejection handler BEFORE advancing timers so the
      // fake-timer-driven rejection is never momentarily unhandled.
      const expectation = expect(p).rejects.toThrow(/analysis aborted/);
      // Settle the readyok handshake + the `go` dispatch.
      await vi.advanceTimersByTimeAsync(0);
      expect(mockWorker.postMessageCalls).toContain('go depth 18 movetime 8000');
      // No bestmove ever comes; advance past the 30s hard timeout.
      await vi.advanceTimersByTimeAsync(31_000);
      await expectation;
      vi.useRealTimers();
    });

    it('rejects getBestMove (and does not hang) when no bestmove arrives — play-surface freeze fix (David 2026-09-07)', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      // DEAD after its `go`: answers nothing at all from then on (an iOS
      // WebKit worker killed mid-search).
      let dead = false;
      const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg.startsWith('go ')) dead = true;
        if (msg === 'isready' && !dead) queueMicrotask(() => mockWorker.emit('readyok'));
      });

      vi.useFakeTimers();
      // moveTimeMs 800 → watchdog fires at max(800+5000, 8000) = 8000ms. Before
      // this fix getBestMove was a bare promise that hung forever on a dead
      // worker, freezing OpeningPlayMode / endgame playout (getCoachMove).
      const p = stockfishEngine.getBestMove(STARTING_FEN, 800);
      const expectation = expect(p).rejects.toThrow(/getBestMove timed out/);
      await vi.advanceTimersByTimeAsync(0);
      expect(mockWorker.postMessageCalls).toContain('go movetime 800');
      // The watchdog, then the `isready` it asks before tearing anything down.
      await vi.advanceTimersByTimeAsync(8_100 + 3_100);
      await expectation;
      // The dead worker was torn down so the next call respawns.
      expect(mockWorker.instance.terminate).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('a getBestMove that times out on a worker that still ANSWERS is not a dead worker: no restart (iOS engine reads, 2026-10-20)', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      scheduleReadyButNoBestmove(); // answers isready; its move search never reports
      vi.useFakeTimers();
      const p = stockfishEngine.getBestMove(STARTING_FEN, 800);
      const expectation = expect(p).rejects.toThrow(/getBestMove timed out/);
      await vi.advanceTimersByTimeAsync(8_100 + 3_100);
      await expectation;
      // The old watchdog tore it down unasked — on the iPhone a live asm
      // worker, every time, and a cold boot under the reads waiting on it.
      expect(mockWorker.instance.terminate).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('recovers fast on the brain budget path (grace) instead of the 30s backstop', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      scheduleReadyButNoBestmove();

      vi.useFakeTimers();
      const p = stockfishEngine.analyzeWithBudget(STARTING_FEN, 12, 300);
      const expectation = expect(p).rejects.toThrow(/analysis aborted/);
      await vi.advanceTimersByTimeAsync(0);
      // analyzeWithBudget now RETRIES once on a fresh worker (self-heal for the
      // transient iOS worker death — David 2026-07-04). With a permanently-dead
      // mock (never returns bestmove) BOTH attempts hit their budget(300)+grace
      // (2000) ≈ 2.3s, so it finally rejects after ~2× that — still well before
      // the 30s backstop. In the REAL case the 2nd attempt hits a live respawned
      // worker and resolves fast; only this dead-mock path exercises the reject.
      await vi.advanceTimersByTimeAsync(5_200);
      await expectation;
      vi.useRealTimers();
    });

    it('queued calls on a dead engine restart it once, not once each (respawn storm, 2026-10-18)', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      scheduleReadyButNoBestmove();
      const restarts = vi.spyOn(stockfishEngine, 'forceRestart');
      vi.useFakeTimers();
      const calls = [0, 1, 2].map(() => stockfishEngine.analyzeWithBudget(STARTING_FEN, 12, 300));
      const settled = Promise.allSettled(calls);
      await vi.advanceTimersByTimeAsync(30_000);
      await settled;
      // The grace timer already tore each dead worker down; no queued call adds
      // a second teardown on top (the old code: one per call, each killing the
      // engine the call before had just respawned).
      expect(restarts.mock.calls.filter((c) => String(c[0]).startsWith('analyzeWithBudget retry-on-death')).length).toBeLessThanOrEqual(1);
      vi.useRealTimers();
    });

    it('an interrupted budget call is not a dead engine: no restart (Learn trace, 2026-10-19)', async () => {
      const { stockfishEngine, AnalysisInterruptedError } = await getEngineModule();
      await initEngine(stockfishEngine);
      const restarts = vi.spyOn(stockfishEngine, 'forceRestart');
      vi.spyOn(stockfishEngine, 'analyzePosition').mockRejectedValueOnce(new AnalysisInterruptedError());
      await expect(stockfishEngine.analyzeWithBudget('8/8/8/8/8/8/8/K6k w - - 0 1', 12, 300)).rejects.toThrow('Analysis interrupted by new request');
      expect(restarts).not.toHaveBeenCalled();
    });

    it('respawns a fresh worker after a stuck analysis is recovered', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      scheduleReadyButNoBestmove();

      vi.useFakeTimers();
      const stuck = stockfishEngine.analyzePosition(STARTING_FEN, 18);
      const expectation = expect(stuck).rejects.toThrow(/analysis aborted/);
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(31_000);
      await expectation;
      vi.useRealTimers();

      // The dead worker was dropped → the next analyze drives a fresh init.
      scheduleAnalysisResponse();
      completeInit();
      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN, 18);
      expect(analysis.bestMove).toBeTruthy();
    });

    // -----------------------------------------------------------------------
    // asm/iOS liveness guard (David 2026-07-05): a slow-but-ALIVE asm worker
    // (streaming `info` lines) must NOT be torn down on the budget grace —
    // tearing it down forces a 45s cold re-parse of the 1.58MB asm bundle,
    // the init-timeout thrash seen in PostHog. A truly silent (dead) worker
    // is STILL torn down (the June-2026 freeze fix stays intact).
    // -----------------------------------------------------------------------
    const IOS_UA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

    it('does NOT tear down a slow-but-ALIVE asm worker on the budget grace', async () => {
      vi.stubGlobal('window', { crossOriginIsolated: false });
      vi.stubGlobal('navigator', { userAgent: IOS_UA, maxTouchPoints: 5, hardwareConcurrency: 4 });
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      expect(stockfishEngine.status).toBe('ready');

      // On `go`, stream an info line but withhold bestmove — a slow, ALIVE search.
      const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
        if (msg.startsWith('go ')) {
          queueMicrotask(() =>
            mockWorker.emit('info depth 10 multipv 1 score cp 20 pv e2e4 e7e5'),
          );
        }
      });

      vi.useFakeTimers();
      const p = stockfishEngine.analyzeWithBudget(STARTING_FEN, 12, 300);
      await vi.advanceTimersByTimeAsync(0); // settle readyok → go → first info

      // Advance across the window that WOULD have torn the worker down
      // (budget 300 + grace 2000), keeping the worker alive with periodic info.
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(2_000);
        mockWorker.emit(`info depth ${12 + i} multipv 1 score cp 25 pv e2e4 e7e5`);
      }
      // Alive the whole time → never terminated, never respawned.
      expect(workerConstructorCallCount).toBe(1);
      expect(mockWorker.instance.terminate).not.toHaveBeenCalled();

      // It finally returns bestmove → the call RESOLVES (no reject/thrash).
      mockWorker.emit('bestmove e2e4');
      const result = await p;
      expect(result.bestMove).toBe('e2e4');
      vi.useRealTimers();
    });

    it('STILL tears down a truly silent (dead) asm worker — freeze fix preserved', async () => {
      vi.stubGlobal('window', { crossOriginIsolated: false });
      vi.stubGlobal('navigator', { userAgent: IOS_UA, maxTouchPoints: 5, hardwareConcurrency: 4 });
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      // Handshake completes but `go` yields NOTHING — a dead/backgrounded worker.
      scheduleReadyButNoBestmove();

      vi.useFakeTimers();
      const p = stockfishEngine.analyzeWithBudget(STARTING_FEN, 12, 300);
      const expectation = expect(p).rejects.toThrow(/analysis aborted/);
      await vi.advanceTimersByTimeAsync(0);
      // No message ever → liveness window lapses → recovered (with the one
      // retry-on-death respawn, also silent, it finally rejects). Must NOT hang.
      await vi.advanceTimersByTimeAsync(40_000);
      await expectation;
      expect(mockWorker.instance.terminate).toHaveBeenCalled();
      vi.useRealTimers();
    });

    // -----------------------------------------------------------------------
    // ios-native RUNTIME stall → demote to asm.js (David 2026-09-02).
    //
    // The native plugin has TWO ways to fail and only one was covered. The
    // INIT-failure path (`demoteNativeToAsm`) sets `_nativeFallbackAttempted`,
    // so the next init falls to asm. But a native engine that inits CLEANLY
    // (uciok + readyok) and then never returns bestmove went down
    // `recoverStuckAnalysis`, whose demote was guarded to `multi` — the
    // transport was torn down and `tryStart` immediately re-picked
    // `ios-native`: reset → stall → reset, forever, with a dead eval bar.
    // Observed on David's iPhone 2026-09-02 (two resets, two re-picks, zero
    // progress, 276 crash rows). The contract: after a runtime stall the
    // engine must come back on the bulletproof asm.js build, NOT on itself.
    // -----------------------------------------------------------------------
    it('demotes ios-native to asm.js after a RUNTIME stall (never re-picks itself)', async () => {
      capacitorState.platform = 'ios';
      capacitorState.native = true;
      capacitorState.pluginAvailable = true;
      vi.stubGlobal('window', { crossOriginIsolated: false });
      vi.stubGlobal('navigator', { userAgent: IOS_UA, maxTouchPoints: 5, hardwareConcurrency: 4 });
      try {
        const { stockfishEngine } = await getEngine();

        // 1. The native engine inits CLEANLY — the case the init-failure
        //    demote never sees. No global Worker is constructed for it; the
        //    plugin transport stands in for one.
        const init = stockfishEngine.initialize();
        await vi.waitFor(() => {
          expect(nativeState.emit).toBeTruthy();
          expect(nativeState.cmds).toContain('uci');
        });
        nativeState.emit?.('uciok');
        await vi.waitFor(() => {
          expect(nativeState.cmds).toContain('isready');
        });
        nativeState.emit?.('readyok');
        await init;
        expect(stockfishEngine.status).toBe('ready');
        expect(workerConstructorCallCount).toBe(0);

        // 2. It then goes SILENT on `go` — alive enough to have handshaked,
        //    dead for search. Drive past the 30s stuck-analysis backstop.
        vi.useFakeTimers();
        const stuck = stockfishEngine.analyzePosition(STARTING_FEN, 18);
        const expectation = expect(stuck).rejects.toThrow(/analysis aborted/);
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(31_000);
        await expectation;
        vi.useRealTimers();

        // 3. The next analysis must come back on asm.js, NOT on ios-native.
        //    A real Worker constructed with the asm bundle is the proof; a
        //    re-pick of ios-native would construct no Worker at all (and stall
        //    again, which is exactly the loop this fixes).
        scheduleAnalysisResponse();
        completeInit();
        const analysis = await stockfishEngine.analyzePosition(STARTING_FEN, 18);
        expect(analysis.bestMove).toBeTruthy();
        expect(workerConstructorUrls).toContain('/stockfish/stockfish-asm.js');
      } finally {
        capacitorState.platform = 'web';
        capacitorState.native = false;
        capacitorState.pluginAvailable = false;
      }
    });
  });

  // -----------------------------------------------------------------------
  // Mate score handling
  // -----------------------------------------------------------------------
  describe('mate score handling', () => {
    it('sets isMate to true for mate scores', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        mateScore: { value: 3, multipv: 1 },
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.isMate).toBe(true);
    });

    it('a BOUNDED mate score never overwrites the exact score (Learn walk 2026-10-02, …Rg2)', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);
      const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
        if (msg.startsWith('go ')) {
          queueMicrotask(() => {
            mockWorker.emit('info depth 14 multipv 1 score cp 700 pv e2e4 e7e5');
            // The search was stopped mid-iteration on an aspiration fail-high.
            mockWorker.emit('info depth 15 multipv 1 score mate 9 lowerbound pv e2e4');
            mockWorker.emit('bestmove e2e4');
          });
        }
      });
      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);
      expect(analysis.isMate).toBe(false);
      expect(analysis.mateIn).toBeNull();
      expect(analysis.evaluation).toBe(700);
    });

    it('sets mateIn to the mate distance', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        mateScore: { value: 3, multipv: 1 },
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.mateIn).toBe(3);
    });

    it('sets negative mateIn for getting mated', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        mateScore: { value: -2, multipv: 1 },
        bestmove: 'e1d1',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.isMate).toBe(true);
      expect(analysis.mateIn).toBe(-2);
    });

    it('encodes a positive mate as 30000 minus its distance', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        mateScore: { value: 5, multipv: 1 },
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.evaluation).toBe(30000 - 5); // the mate's distance rides in the eval
    });

    it('encodes a negative mate as -(30000 minus its distance)', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        mateScore: { value: -3, multipv: 1 },
        bestmove: 'e1d1',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.evaluation).toBe(-(30000 - 3));
    });

    it('sets isMate to false for centipawn scores', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        lines: [{ multipv: 1, cp: 30, pv: 'e2e4 e7e5' }],
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.isMate).toBe(false);
      expect(analysis.mateIn).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getBestMove
  // -----------------------------------------------------------------------
  describe('getBestMove', () => {
    it('sends go movetime command', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const pmMock = mockWorker.instance.postMessage as ReturnType<
        typeof vi.fn
      >;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg.startsWith('go movetime')) {
          queueMicrotask(() =>
            mockWorker.emit('bestmove d2d4 ponder d7d5'),
          );
        }
      });

      await stockfishEngine.getBestMove(STARTING_FEN, 2000);

      expect(mockWorker.postMessageCalls).toContain('go movetime 2000');
    });

    it('returns best move string', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const pmMock = mockWorker.instance.postMessage as ReturnType<
        typeof vi.fn
      >;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg.startsWith('go movetime')) {
          queueMicrotask(() =>
            mockWorker.emit('bestmove g1f3 ponder d7d5'),
          );
        }
      });

      const move = await stockfishEngine.getBestMove(STARTING_FEN);

      expect(move).toBe('g1f3');
    });

    it('uses default moveTime of 1000ms', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const pmMock = mockWorker.instance.postMessage as ReturnType<
        typeof vi.fn
      >;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg.startsWith('go movetime')) {
          queueMicrotask(() => mockWorker.emit('bestmove e2e4'));
        }
      });

      await stockfishEngine.getBestMove(STARTING_FEN);

      expect(mockWorker.postMessageCalls).toContain('go movetime 1000');
    });

    it('sends position fen command before go', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const pmMock = mockWorker.instance.postMessage as ReturnType<
        typeof vi.fn
      >;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg.startsWith('go movetime')) {
          queueMicrotask(() => mockWorker.emit('bestmove d2d4'));
        }
      });

      const fen =
        'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2';
      await stockfishEngine.getBestMove(fen);

      expect(mockWorker.postMessageCalls).toContain(`position fen ${fen}`);

      const posIdx = mockWorker.postMessageCalls.indexOf(
        `position fen ${fen}`,
      );
      const goIdx = mockWorker.postMessageCalls.indexOf('go movetime 1000');
      expect(posIdx).toBeLessThan(goIdx);
    });
  });

  // -----------------------------------------------------------------------
  // stop
  // -----------------------------------------------------------------------
  describe('stop', () => {
    it('sends stop command to worker', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      stockfishEngine.stop();

      expect(mockWorker.postMessageCalls).toContain('stop');
    });

    it('does nothing if engine not initialized', async () => {
      const { stockfishEngine } = await getEngine();

      stockfishEngine.stop();

      expect(mockWorker.instance.postMessage).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // destroy
  // -----------------------------------------------------------------------
  describe('destroy', () => {
    it('terminates the worker', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      stockfishEngine.destroy();

      expect(mockWorker.instance.terminate).toHaveBeenCalled();
    });

    it('resets internal state so isReady is false', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      stockfishEngine.destroy();

      // After destroy, stop() should not send commands (worker is null)
      const callsBefore = mockWorker.postMessageCalls.length;
      stockfishEngine.stop();
      expect(mockWorker.postMessageCalls.length).toBe(callsBefore);
    });

    it('allows re-initialization after destroy', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      stockfishEngine.destroy();

      // Create a new mock worker for re-init
      const newMockWorker = createMockWorker();
      vi.stubGlobal(
        'Worker',
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class
        class ReInitMockWorker {
          constructor() {
            workerConstructorCallCount++;
            return newMockWorker.instance as unknown as ReInitMockWorker;
          }
        },
      );

      const initPromise = stockfishEngine.initialize();
      queueMicrotask(() => {
        newMockWorker.emit('uciok');
        queueMicrotask(() => newMockWorker.emit('readyok'));
      });
      await initPromise;

      expect(workerConstructorCallCount).toBe(2);
      expect(newMockWorker.postMessageCalls).toContain('uci');
      expect(newMockWorker.postMessageCalls).toContain('isready');
    });

    it('sends stop before terminate', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      stockfishEngine.destroy();

      expect(mockWorker.postMessageCalls).toContain('stop');
      expect(mockWorker.instance.terminate).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Concurrent analysis
  // -----------------------------------------------------------------------
  describe('concurrent analysis', () => {
    it('sends stop when a brain analyzePosition interrupts an in-flight prefetch', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      // First (prefetch) analysis: respond to isready but let "go" hang
      const pmMock = mockWorker.instance.postMessage as ReturnType<
        typeof vi.fn
      >;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
      });

      const firstAnalysis = stockfishEngine.analyzePosition(
        STARTING_FEN,
        12,
        undefined,
        'prefetch',
      );

      // Let microtasks settle so first analysis is fully set up
      await new Promise((r) => setTimeout(r, 10));

      // Second (brain) analysis: respond to everything
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
        if (msg.startsWith('go depth')) {
          queueMicrotask(() => emitAnalysisResponse({ bestmove: 'd7d5' }));
        }
      });

      const secondFen =
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const secondAnalysis = stockfishEngine.analyzePosition(secondFen);

      await expect(firstAnalysis).rejects.toThrow(
        'Analysis interrupted by new request',
      );

      const result = await secondAnalysis;
      expect(result.bestMove).toBe('d7d5');
      expect(mockWorker.postMessageCalls).toContain('stop');
    });

    it('rejects the previous pending prefetch when a brain call arrives', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const pmMock = mockWorker.instance.postMessage as ReturnType<
        typeof vi.fn
      >;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
      });

      const first = stockfishEngine.analyzePosition(
        STARTING_FEN,
        12,
        undefined,
        'prefetch',
      );

      await new Promise((r) => setTimeout(r, 10));

      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
        if (msg.startsWith('go depth')) {
          queueMicrotask(() => emitAnalysisResponse());
        }
      });

      const second = stockfishEngine.analyzePosition(STARTING_FEN);

      await expect(first).rejects.toThrow('interrupted');
      const result = await second;
      expect(result.bestMove).toBe('e2e4');
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('worker error event rejects the init promise', async () => {
      const { stockfishEngine } = await getEngine();

      const initPromise = stockfishEngine.initialize();

      mockWorker.emitError('WASM load failed');

      await expect(initPromise).rejects.toThrow('WASM load failed');
    });
  });

  // -----------------------------------------------------------------------
  // onAnalysis handler
  // -----------------------------------------------------------------------
  describe('onAnalysis', () => {
    it('notifies registered handlers when analysis completes', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const handler = vi.fn();
      stockfishEngine.onAnalysis(handler);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ bestMove: 'e2e4' }),
      );
    });

    it('returns an unsubscribe function', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const handler = vi.fn();
      const unsubscribe = stockfishEngine.onAnalysis(handler);

      unsubscribe();

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Analysis result shape
  // -----------------------------------------------------------------------
  describe('analysis result shape', () => {
    it('conforms to StockfishAnalysis interface', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();

      const analysis: StockfishAnalysis =
        await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis).toHaveProperty('bestMove');
      expect(analysis).toHaveProperty('evaluation');
      expect(analysis).toHaveProperty('isMate');
      expect(analysis).toHaveProperty('mateIn');
      expect(analysis).toHaveProperty('depth');
      expect(analysis).toHaveProperty('topLines');
      expect(analysis).toHaveProperty('nodesPerSecond');
      expect(typeof analysis.bestMove).toBe('string');
      expect(typeof analysis.evaluation).toBe('number');
      expect(typeof analysis.isMate).toBe('boolean');
      expect(typeof analysis.depth).toBe('number');
      expect(Array.isArray(analysis.topLines)).toBe(true);
    });

    it('AnalysisLine has correct shape', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);
      const line = analysis.topLines[0];

      expect(line).toHaveProperty('rank');
      expect(line).toHaveProperty('evaluation');
      expect(line).toHaveProperty('moves');
      expect(line).toHaveProperty('mate');
      expect(typeof line.rank).toBe('number');
      expect(typeof line.evaluation).toBe('number');
      expect(Array.isArray(line.moves)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // queueAnalysis
  // -----------------------------------------------------------------------
  describe('queueAnalysis', () => {
    it('resolves with analysis result', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({ bestmove: 'e2e4' });

      const result = await stockfishEngine.queueAnalysis(STARTING_FEN, 18);
      expect(result.bestMove).toBe('e2e4');
    });

    it('serializes two requests — second waits for first', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      const order: string[] = [];

      const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
        if (msg.startsWith('go depth')) {
          queueMicrotask(() => {
            order.push('analysis');
            emitAnalysisResponse();
          });
        }
      });

      // Distinct FENs so the LRU cache can't short-circuit the second
      // analysis — we're testing serialization through the worker, not
      // cache hits. Same FEN at the same depth would be a cache hit on
      // the second request after the first populates the cache.
      const FEN_A = STARTING_FEN;
      const FEN_B =
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const p1 = stockfishEngine.queueAnalysis(FEN_A).then((r) => {
        order.push('p1-resolved');
        return r;
      });
      const p2 = stockfishEngine.queueAnalysis(FEN_B).then((r) => {
        order.push('p2-resolved');
        return r;
      });

      await Promise.all([p1, p2]);

      // Both should resolve, p1 before p2
      expect(order).toEqual(['analysis', 'p1-resolved', 'analysis', 'p2-resolved']);
    });

    it('rejects all queued entries on destroy', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      // Block the engine so queue builds up
      const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
        // Don't respond to "go" — hang intentionally
      });

      const p1 = stockfishEngine.queueAnalysis(STARTING_FEN);
      const p2 = stockfishEngine.queueAnalysis(STARTING_FEN);

      // Give the first analysis time to start running
      await new Promise((r) => setTimeout(r, 20));

      stockfishEngine.destroy();

      // p1 is interrupted, p2 is rejected from the queue drain cleanup
      await expect(p1).rejects.toThrow();
      await expect(p2).rejects.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// resolveWorkerUrl — runtime detection of multi vs single-threaded variant
// ---------------------------------------------------------------------------

describe('resolveWorkerUrl', () => {
  // The no-window branch can't sniff the platform, so it must NEVER guess the
  // SIMD WASM single build — that is the one build that `call_indirect`-traps on
  // iOS WebKit (the 2026-09-02 crash storm: 276 traps from
  // stockfish-18-lite-single.js in 4 minutes). asm.js runs everywhere; a slower
  // working engine beats a crashing one.
  it('returns the asm.js build when window is undefined (never guess the crashing WASM single build)', async () => {
    vi.stubGlobal('window', undefined);
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const result = resolveWorkerUrl();
    expect(result.variant).toBe('asm');
    expect(result.url).toBe('/stockfish/stockfish-asm.js');
    expect(result.url).not.toBe('/stockfish/stockfish-18-lite-single.js');
    expect(result.reason).toContain('no-window');
  });

  it('returns multi-threaded variant when crossOriginIsolated and SharedArrayBuffer are both available', async () => {
    vi.stubGlobal('window', { crossOriginIsolated: true });
    vi.stubGlobal('SharedArrayBuffer', function SharedArrayBufferStub() { /* stub */ });
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const result = resolveWorkerUrl();
    expect(result.variant).toBe('multi');
    expect(result.url).toBe('/stockfish/stockfish-18-lite.js');
    expect(result.reason).toContain('crossOriginIsolated');
    expect(result.reason).toContain('SharedArrayBuffer');
  });

  it('routes iOS Safari to the asm.js build when NOT cross-origin isolated', async () => {
    vi.stubGlobal('window', { crossOriginIsolated: false });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      maxTouchPoints: 5,
    });
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const result = resolveWorkerUrl();
    expect(result.variant).toBe('asm');
    expect(result.url).toBe('/stockfish/stockfish-asm.js');
    expect(result.workerType).toBe('classic');
  });

  it('routes iOS to the asm.js build EVEN cross-origin isolated (Option A reversed — multi OOMs the iPhone)', async () => {
    // "Option A" bet iOS+SAB could run the threaded build like desktop.
    // Production disproved it: with SAB present the picker chose multi and the
    // threaded WASM heap OOM'd on iPhone memory limits — 100% of the Stockfish
    // crashes in PostHog (7 days, 2026-06-28) were iOS "Out of memory" on multi.
    // iOS now ALWAYS uses asm regardless of SAB.
    vi.stubGlobal('window', { crossOriginIsolated: true });
    vi.stubGlobal('SharedArrayBuffer', function SharedArrayBufferStub() { /* stub */ });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      maxTouchPoints: 5,
    });
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const result = resolveWorkerUrl();
    expect(result.variant).toBe('asm');
    expect(result.url).toBe('/stockfish/stockfish-asm.js');
  });

  it('falls back to single-threaded variant when crossOriginIsolated is false', async () => {
    vi.stubGlobal('window', { crossOriginIsolated: false });
    vi.stubGlobal('SharedArrayBuffer', function SharedArrayBufferStub() { /* stub */ });
    vi.stubGlobal('WebAssembly', { validate: () => true }); // SIMD-capable engine
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const result = resolveWorkerUrl();
    expect(result.variant).toBe('single');
    expect(result.url).toBe('/stockfish/stockfish-18-lite-single.js');
    expect(result.reason).toContain('multi-thread requirements not met');
    expect(result.reason).toContain('crossOriginIsolated=false');
  });

  it('routes a non-iOS engine WITHOUT WASM SIMD to the asm.js build (root fix for the 0xfd / Unreachable-code crash)', async () => {
    // crossOriginIsolated + SAB would otherwise pick the SIMD-enabled `multi`
    // WASM build — but without SIMD it fails to compile ("Invalid opcode 0xfd")
    // or traps at runtime. Route to the SIMD-free asm.js build up front.
    vi.stubGlobal('window', { crossOriginIsolated: true });
    vi.stubGlobal('SharedArrayBuffer', function SharedArrayBufferStub() { /* stub */ });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80 Mobile', maxTouchPoints: 0 });
    vi.stubGlobal('WebAssembly', { validate: () => false });
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const result = resolveWorkerUrl();
    expect(result.variant).toBe('asm');
    expect(result.url).toBe('/stockfish/stockfish-asm.js');
    expect(result.reason).toContain('SIMD');
  });

  it('keeps the WASM multi build when SIMD IS supported (non-iOS, isolated + SAB)', async () => {
    vi.stubGlobal('window', { crossOriginIsolated: true });
    vi.stubGlobal('SharedArrayBuffer', function SharedArrayBufferStub() { /* stub */ });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120', maxTouchPoints: 0 });
    vi.stubGlobal('WebAssembly', { validate: () => true });
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    expect(resolveWorkerUrl().variant).toBe('multi');
  });

  it('routes a Capacitor native-iOS WebView spoofing the desktop-Safari UA to asm.js (root fix for the call_indirect / Unreachable WASM traps from capacitor:// iOS)', async () => {
    // The exact PostHog crash device: native iOS app whose WKWebView reports
    // the FROZEN desktop-Safari UA ("Macintosh; Intel Mac OS X 10_15_7",
    // maxTouchPoints 0) and claims WASM SIMD — the UA heuristic misses it and,
    // without the Capacitor.getPlatform() short-circuit, it would pick the WASM
    // single/multi build that WebKit traps on (`call_indirect to a signature
    // that does not match`). getPlatform() === 'ios' must pin it to asm.js.
    capacitorState.platform = 'ios';
    try {
      vi.stubGlobal('window', { crossOriginIsolated: true });
      vi.stubGlobal('SharedArrayBuffer', function SharedArrayBufferStub() { /* stub */ });
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Safari/605.1.15',
        maxTouchPoints: 0,
      });
      vi.stubGlobal('WebAssembly', { validate: () => true }); // SIMD present — only the platform check saves it
      vi.resetModules();
      const { resolveWorkerUrl } = await import('./stockfishEngine');
      const result = resolveWorkerUrl();
      expect(result.variant).toBe('asm');
      expect(result.url).toBe('/stockfish/stockfish-asm.js');
    } finally {
      capacitorState.platform = 'web';
    }
  });

  it('falls back to single-threaded variant when SharedArrayBuffer is undefined (even with isolation)', async () => {
    vi.stubGlobal('window', { crossOriginIsolated: true });
    vi.stubGlobal('SharedArrayBuffer', undefined);
    vi.resetModules();
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const result = resolveWorkerUrl();
    expect(result.variant).toBe('single');
    expect(result.url).toBe('/stockfish/stockfish-18-lite-single.js');
    expect(result.reason).toContain('SharedArrayBuffer=false');
  });
});

// ---------------------------------------------------------------------------
// analyzePosition — priority-based contention rules
// ---------------------------------------------------------------------------

describe('analyzePosition priority', () => {
  it('drops an incoming prefetch when a brain eval is in flight', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);

    // Hook postMessage to defer responses so we can inspect the
    // intermediate state. The brain eval starts but does not resolve
    // until we manually emit bestmove.
    let goSeen = false;
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') {
        queueMicrotask(() => mockWorker.emit('readyok'));
      }
      if (msg.startsWith('go ')) {
        goSeen = true;
      }
    });

    const brain = stockfishEngine.analyzePosition(STARTING_FEN, 18);
    // Let the brain eval reach `go` so this.pending is set with brain priority.
    await vi.waitFor(() => {
      expect(goSeen).toBe(true);
    });

    // Prefetch arrives while brain is in flight — should be dropped
    // immediately with PrefetchDroppedError.
    await expect(
      stockfishEngine.analyzePosition(STARTING_FEN, 12, undefined, 'prefetch'),
    ).rejects.toThrow(/prefetch dropped/i);

    // Brain eval should still complete normally.
    queueMicrotask(() =>
      mockWorker.emit(
        'info depth 18 multipv 1 score cp 30 pv e2e4 e7e5',
      ),
    );
    queueMicrotask(() => mockWorker.emit('bestmove e2e4'));
    const result = await brain;
    expect(result.bestMove).toBe('e2e4');
  });

  it('cancels an in-flight prefetch when a brain call arrives', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);

    let goCount = 0;
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') {
        queueMicrotask(() => mockWorker.emit('readyok'));
      }
      if (msg.startsWith('go ')) {
        goCount++;
      }
    });

    // Start a prefetch that we leave hanging.
    const prefetch = stockfishEngine.analyzePosition(
      STARTING_FEN,
      12,
      undefined,
      'prefetch',
    );
    await vi.waitFor(() => {
      expect(goCount).toBe(1);
    });

    // Brain arrives — should cancel the prefetch.
    const brain = stockfishEngine.analyzePosition(STARTING_FEN, 18);

    await expect(prefetch).rejects.toThrow(/Analysis interrupted/i);

    // Drive brain to completion.
    await vi.waitFor(() => {
      expect(goCount).toBe(2);
    });
    queueMicrotask(() =>
      mockWorker.emit(
        'info depth 18 multipv 1 score cp 30 pv e2e4 e7e5',
      ),
    );
    queueMicrotask(() => mockWorker.emit('bestmove e2e4'));
    const result = await brain;
    expect(result.bestMove).toBe('e2e4');
  });

  it('serializes brain-on-brain — in-flight brain completes before new brain starts', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);

    const goFens: string[] = [];
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    let lastPositionFen = '';
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') {
        queueMicrotask(() => mockWorker.emit('readyok'));
      }
      const posMatch = /^position fen (.+)$/.exec(msg);
      if (posMatch) {
        lastPositionFen = posMatch[1];
      }
      if (msg.startsWith('go ')) {
        goFens.push(lastPositionFen);
      }
    });

    const FEN_A =
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const FEN_B =
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

    const brainA = stockfishEngine.analyzePosition(FEN_A, 18);
    // Wait until brainA reaches `go`.
    await vi.waitFor(() => {
      expect(goFens).toEqual([FEN_A]);
    });

    // Brain B arrives while A is in flight. With cancel-on-new
    // behavior it would supersede A; with serialization it must wait.
    const brainB = stockfishEngine.analyzePosition(FEN_B, 18);

    // Give the microtask queue a tick to process. B must NOT have
    // started yet — only A's `go` should be on the wire.
    await Promise.resolve();
    await Promise.resolve();
    expect(goFens).toEqual([FEN_A]);

    // Resolve brainA.
    queueMicrotask(() =>
      mockWorker.emit(
        'info depth 18 multipv 1 score cp 30 pv e7e5 g1f3',
      ),
    );
    queueMicrotask(() => mockWorker.emit('bestmove e7e5'));
    const resultA = await brainA;
    expect(resultA.bestMove).toBe('e7e5');

    // Now B should start.
    await vi.waitFor(() => {
      expect(goFens).toEqual([FEN_A, FEN_B]);
    });
    queueMicrotask(() =>
      mockWorker.emit(
        'info depth 18 multipv 1 score cp 25 pv g1f3 b8c6',
      ),
    );
    queueMicrotask(() => mockWorker.emit('bestmove g1f3'));
    const resultB = await brainB;
    expect(resultB.bestMove).toBe('g1f3');
  });

  it('default priority is brain (no explicit priority arg behaves like brain)', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);

    let goCount = 0;
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') {
        queueMicrotask(() => mockWorker.emit('readyok'));
      }
      if (msg.startsWith('go ')) {
        goCount++;
      }
    });

    // No explicit priority — defaults to 'brain'.
    const first = stockfishEngine.analyzePosition(STARTING_FEN, 18);
    await vi.waitFor(() => {
      expect(goCount).toBe(1);
    });

    // A subsequent prefetch must be dropped — proving the first
    // call was treated as brain priority.
    await expect(
      stockfishEngine.analyzePosition(STARTING_FEN, 12, undefined, 'prefetch'),
    ).rejects.toThrow(/prefetch dropped/i);

    queueMicrotask(() =>
      mockWorker.emit(
        'info depth 18 multipv 1 score cp 30 pv e2e4 e7e5',
      ),
    );
    queueMicrotask(() => mockWorker.emit('bestmove e2e4'));
    await first;
  });
});

// ---------------------------------------------------------------------------
// Runtime fallback — multi-thread bundle fails despite capabilities
// ---------------------------------------------------------------------------

describe('runtime fallback (multi → single)', () => {
  // Helper: install COI + SAB so resolveWorkerUrl picks 'multi', and
  // a Worker stub that captures every URL passed to `new Worker(...)`.
  // Returns the URL log so tests can assert which bundle was spawned.
  function installMultiCapableEnv(): { workerUrls: string[] } {
    vi.stubGlobal('window', {
      crossOriginIsolated: true,
      location: { pathname: '/' },
    });
    vi.stubGlobal('SharedArrayBuffer', function SharedArrayBufferStub() { /* stub */ });

    const workerUrls: string[] = [];
    vi.stubGlobal(
      'Worker',
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class MockWorkerClass {
        constructor(url: string) {
          workerUrls.push(url);
          workerConstructorCallCount++;
          return mockWorker.instance as unknown as MockWorkerClass;
        }
      },
    );

    return { workerUrls };
  }

  it('selects multi-thread when capabilities are present and uciok arrives', async () => {
    const { workerUrls } = installMultiCapableEnv();
    const { stockfishEngine } = await getEngine();

    completeInit();
    await stockfishEngine.initialize();

    expect(workerUrls).toEqual(['/stockfish/stockfish-18-lite.js']);
    expect(workerConstructorCallCount).toBe(1);
    // Threads are CAPPED (perf fix 2026-09-08): the multi-thread singleton no
    // longer takes every core — at teaching depths the best move is unchanged and
    // saturating the CPU made the app choppy. Assert the CONTRACT (a Threads
    // option is set, capped to 1..4) rather than a magic number, so it holds
    // across machines regardless of navigator.hardwareConcurrency.
    const threadsMsg = mockWorker.postMessageCalls.find((m: string) => /^setoption name Threads value \d+$/.test(m));
    expect(threadsMsg, 'a Threads option must be set on the multi variant').toBeTruthy();
    const threads = Number(/value (\d+)$/.exec(threadsMsg ?? '')?.[1]);
    expect(threads).toBeGreaterThanOrEqual(1);
    expect(threads).toBeLessThanOrEqual(4);
  });

  it('falls back to single when multi-thread worker.onerror fires before uciok', async () => {
    const { workerUrls } = installMultiCapableEnv();
    const { stockfishEngine } = await getEngine();

    const initPromise = stockfishEngine.initialize();

    // Let the multi-thread worker construct and the engine send 'uci'.
    await Promise.resolve();
    await Promise.resolve();
    expect(workerUrls).toEqual(['/stockfish/stockfish-18-lite.js']);

    // Phase 8 — the engine now waits ~100ms after terminate() for
    // the browser to reclaim the multi-thread WASM heap before
    // spawning the single-thread fallback. Fake timers MUST be
    // active before the error fires so the setTimeout call is
    // captured.
    vi.useFakeTimers();
    // Multi-thread bundle throws before responding with uciok.
    mockWorker.emitError('runtime crash in pthread spawn');
    vi.advanceTimersByTime(150);
    vi.useRealTimers();

    // Microtasks settle, fallback kicks off, second worker is spawned.
    await Promise.resolve();
    await Promise.resolve();
    expect(workerUrls).toEqual([
      '/stockfish/stockfish-18-lite.js',
      '/stockfish/stockfish-18-lite-single.js',
    ]);

    // Drive the single-thread handshake to completion.
    queueMicrotask(() => {
      mockWorker.emit('uciok');
      queueMicrotask(() => mockWorker.emit('readyok'));
    });
    await initPromise;

    expect(stockfishEngine.status).toBe('ready');
    // Threads/Hash setoption should NOT have been sent — single-thread
    // skips them.
    expect(mockWorker.postMessageCalls).not.toContain(
      'setoption name Threads value 4',
    );
  });

  // Cold-boot flood guard (2026-07-13): a multi-thread pthread SUB-worker
  // throws uncaught (wasm load failure on a constrained host) — that escapes
  // this.worker.onerror and surfaces as a window 'error'. The guard catches
  // the FIRST stockfish-sourced one, suppresses the flood, and trips the
  // fallback immediately instead of waiting out the 5s early-failure timer
  // while ~1000 more errors pile up. Enrich the window stub with the listener
  // API the real browser has (installMultiCapableEnv omits it).
  function installMultiWithWindowListeners(): {
    workerUrls: string[];
    errorListeners: Array<(e: unknown) => void>;
  } {
    const { workerUrls } = installMultiCapableEnv();
    const errorListeners: Array<(e: unknown) => void> = [];
    vi.stubGlobal('window', {
      crossOriginIsolated: true,
      location: { pathname: '/' },
      addEventListener: (type: string, cb: (e: unknown) => void) => {
        if (type === 'error') errorListeners.push(cb);
      },
      removeEventListener: (type: string, cb: (e: unknown) => void) => {
        if (type !== 'error') return;
        const i = errorListeners.indexOf(cb);
        if (i >= 0) errorListeners.splice(i, 1);
      },
    });
    return { workerUrls, errorListeners };
  }

  it('cold-boot flood guard: a stockfish-sourced page error during multi boot trips a FAST fallback + suppresses the flood', async () => {
    const { workerUrls, errorListeners } = installMultiWithWindowListeners();
    const { stockfishEngine } = await getEngine();

    const initPromise = stockfishEngine.initialize();
    await Promise.resolve();
    await Promise.resolve();
    expect(workerUrls).toEqual(['/stockfish/stockfish-18-lite.js']);
    // Guard armed on the multi spawn.
    expect(errorListeners.length).toBe(1);

    // A pthread sub-worker throws uncaught → window 'error' with the
    // /stockfish/ filename (the exact 2026-07-13 crash signature).
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();
    vi.useFakeTimers();
    errorListeners[0]({
      filename: '/stockfish/stockfish-18-lite.js',
      message: 't.startsWith is not a function',
      preventDefault,
      stopImmediatePropagation,
    });
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();

    // Flood suppressed AND a fast fallback to single-thread — no 5s wait.
    expect(preventDefault).toHaveBeenCalled();
    expect(stopImmediatePropagation).toHaveBeenCalled();
    expect(workerUrls).toEqual([
      '/stockfish/stockfish-18-lite.js',
      '/stockfish/stockfish-18-lite-single.js',
    ]);
    // Guard torn down after the fallback fired.
    expect(errorListeners.length).toBe(0);

    queueMicrotask(() => {
      mockWorker.emit('uciok');
      queueMicrotask(() => mockWorker.emit('readyok'));
    });
    await initPromise;
    expect(stockfishEngine.status).toBe('ready');
  });

  it('#21 storm guard: a MESSAGE-LESS page error during multi boot trips the fast fallback (2026-09-20)', async () => {
    // Measured with audit-engine-worker-census-prod on the reopened review: the
    // multi engine could not allocate its shared heap, the pthread runtime
    // spawned ~120 Workers in 5 s, and every failed start raised an ErrorEvent
    // with NO filename and NO message — 761,548 of them, none matching
    // '/stockfish/', so the guard above never tripped. Before uciok only the
    // engine's own runtime raises bare errors by the dozen; trip on the first.
    const { workerUrls, errorListeners } = installMultiWithWindowListeners();
    const { stockfishEngine } = await getEngine();
    const initPromise = stockfishEngine.initialize();
    await Promise.resolve();
    await Promise.resolve();
    expect(workerUrls).toEqual(['/stockfish/stockfish-18-lite.js']);
    expect(errorListeners.length).toBe(1);
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();
    vi.useFakeTimers();
    errorListeners[0]({ filename: '', message: '', preventDefault, stopImmediatePropagation });
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();
    expect(preventDefault).toHaveBeenCalled();
    expect(stopImmediatePropagation).toHaveBeenCalled();
    expect(workerUrls).toEqual([
      '/stockfish/stockfish-18-lite.js',
      '/stockfish/stockfish-18-lite-single.js',
    ]);
    expect(errorListeners.length).toBe(0);
    queueMicrotask(() => {
      mockWorker.emit('uciok');
      queueMicrotask(() => mockWorker.emit('readyok'));
    });
    await initPromise;
    expect(stockfishEngine.status).toBe('ready');
  });

  it('cold-boot flood guard: IGNORES non-stockfish page errors (never swallows app errors)', async () => {
    const { workerUrls, errorListeners } = installMultiWithWindowListeners();
    const { stockfishEngine } = await getEngine();

    void stockfishEngine.initialize();
    await Promise.resolve();
    await Promise.resolve();
    expect(errorListeners.length).toBe(1);

    // An UNRELATED app error must pass straight through — not suppressed,
    // no engine fallback.
    const preventDefault = vi.fn();
    errorListeners[0]({
      filename: 'https://chess-academy-pro.vercel.app/assets/index-abc.js',
      message: 'some unrelated app TypeError',
      preventDefault,
      stopImmediatePropagation: vi.fn(),
    });
    await Promise.resolve();

    expect(preventDefault).not.toHaveBeenCalled();
    // Still only the multi worker — no fallback was triggered.
    expect(workerUrls).toEqual(['/stockfish/stockfish-18-lite.js']);
  });

  it('does not retry the multi bundle on subsequent initialize() calls (sticky fallback)', async () => {
    const { workerUrls } = installMultiCapableEnv();
    const { stockfishEngine } = await getEngine();

    // First initialize: multi fails → fallback to single → success.
    const first = stockfishEngine.initialize();
    await Promise.resolve();
    await Promise.resolve();
    // Phase 8 reclaim delay: fake timers must be active BEFORE the
    // error fires so the setTimeout call is captured.
    vi.useFakeTimers();
    mockWorker.emitError('runtime crash');
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();
    queueMicrotask(() => {
      mockWorker.emit('uciok');
      queueMicrotask(() => mockWorker.emit('readyok'));
    });
    await first;
    expect(workerUrls).toEqual([
      '/stockfish/stockfish-18-lite.js',
      '/stockfish/stockfish-18-lite-single.js',
    ]);

    // Force a fresh init by destroying.
    stockfishEngine.destroy();

    // Second initialize: should go straight to single, no multi probe.
    completeInit();
    await stockfishEngine.initialize();

    expect(workerUrls).toEqual([
      '/stockfish/stockfish-18-lite.js',
      '/stockfish/stockfish-18-lite-single.js',
      '/stockfish/stockfish-18-lite-single.js',
    ]);
  });

  it('treats single-thread worker.onerror as a real init failure (no fallback loop)', async () => {
    // Capabilities present so resolveWorkerUrl picks multi, but we
    // immediately push the engine into the single variant by
    // simulating a multi failure first. After fallback succeeds,
    // pretend single also crashes — should NOT try multi again.
    installMultiCapableEnv();
    const { stockfishEngine } = await getEngine();

    const initPromise = stockfishEngine.initialize();
    await Promise.resolve();
    await Promise.resolve();
    // Phase 8 added a reclaim delay before the single-thread spawn.
    // Fake timers must be active BEFORE the error fires.
    vi.useFakeTimers();
    mockWorker.emitError('multi crash');
    vi.advanceTimersByTime(200);
    // Advance past the 500ms dedup window so the next error is
    // processed as a fresh event, not coalesced with the multi crash.
    vi.advanceTimersByTime(600);
    // Now simulate the SINGLE-thread worker also failing — with a
    // non-OOM message so the OOM-retry path doesn't intercept it.
    mockWorker.emitError('single crash too');
    vi.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();

    // Init should reject; no further worker constructions.
    await expect(initPromise).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // Phase 8 — crash hygiene (dedup, reclaim delay, OOM retry)
  // -----------------------------------------------------------------------
  describe('crash hygiene (Phase 8)', () => {
    /** Build a single ErrorEvent-like object that records whether
     *  preventDefault was called. The engine's onerror handler is
     *  expected to call .preventDefault() so worker errors don't
     *  bubble to window.onerror. */
    function makeErrorEvent(message: string): ErrorEvent & { defaultPrevented: boolean } {
      let prevented = false;
      const ev = {
        message,
        preventDefault: () => {
          prevented = true;
        },
      } as unknown as ErrorEvent & { defaultPrevented: boolean };
      Object.defineProperty(ev, 'defaultPrevented', {
        get: () => prevented,
      });
      return ev;
    }

    it('calls preventDefault on worker.onerror to stop bubbling to window.onerror', async () => {
      const { stockfishEngine } = await getEngine();
      const initPromise = stockfishEngine.initialize();
      initPromise.catch(() => undefined); // attach catcher before any reject
      await Promise.resolve();
      const ev = makeErrorEvent('worker boom');
      vi.useFakeTimers();
      mockWorker.instance.onerror?.(ev);
      vi.advanceTimersByTime(200);
      vi.useRealTimers();
      expect(ev.defaultPrevented).toBe(true);
    });

    it('coalesces a burst of worker errors into a single fallback path', async () => {
      const { stockfishEngine } = await getEngine();
      const initPromise = stockfishEngine.initialize();
      initPromise.catch(() => undefined);
      await Promise.resolve();

      const beforeBurst = workerConstructorCallCount;
      // Burst of 60 ErrorEvents in the same crash window — same shape
      // as the audit-cycle dbaee3b finding cluster.
      vi.useFakeTimers();
      for (let i = 0; i < 60; i += 1) {
        mockWorker.instance.onerror?.(makeErrorEvent(`burst-${i}`));
      }
      // Drive the reclaim delay so the (single) single-thread spawn
      // actually happens.
      vi.advanceTimersByTime(200);
      vi.useRealTimers();
      await Promise.resolve();

      // Exactly one new worker construction — the single-thread
      // fallback. NOT 60.
      expect(workerConstructorCallCount - beforeBurst).toBeLessThanOrEqual(1);
    });

    it('retries single-thread spawn once on OOM with a backoff', async () => {
      const { stockfishEngine } = await getEngine();
      const initPromise = stockfishEngine.initialize();
      initPromise.catch(() => undefined);
      await Promise.resolve();

      // Multi crashes → fall back to single.
      vi.useFakeTimers();
      mockWorker.instance.onerror?.(makeErrorEvent('multi crash'));
      vi.advanceTimersByTime(200); // reclaim delay
      vi.useRealTimers();
      await Promise.resolve();

      const afterFallbackCount = workerConstructorCallCount;
      // Single-thread spawn ALSO OOMs. Reset the dedup window so the
      // OOM error isn't coalesced with the prior multi error — in
      // production they'd be in different windows naturally.
      vi.useFakeTimers();
      // advance past the dedup window first
      vi.advanceTimersByTime(600);
      mockWorker.instance.onerror?.(
        makeErrorEvent(
          'Uncaught RuntimeError: Aborted(RangeError: WebAssembly.instantiate(): Out of memory: Cannot allocate Wasm memory for new instance)',
        ),
      );
      // Phase 8 Bug C — engine should retry once after the backoff
      // window. Advance timers past the retry delay.
      vi.advanceTimersByTime(600);
      vi.useRealTimers();
      await Promise.resolve();

      // One additional worker spawned by the retry path.
      expect(workerConstructorCallCount).toBe(afterFallbackCount + 1);
    });

    it('persists the multi-thread fallback flag to localStorage on first failure', async () => {
      installMultiCapableEnv();
      const { stockfishEngine } = await getEngine();
      const initPromise = stockfishEngine.initialize();
      initPromise.catch(() => undefined);
      await Promise.resolve();

      // Multi crashes. Phase 9 should write the persisted flag.
      vi.useFakeTimers();
      mockWorker.emitError('multi crash');
      vi.advanceTimersByTime(200);
      vi.useRealTimers();
      await Promise.resolve();

      // A TIMESTAMP, not a bare '1'. The flag used to be permanent, so one
      // transient crash retired the fast engine on that device forever; it now
      // records WHEN the failure happened so it can expire (2026-08-01).
      const stamp = localStorage.getItem('sfx.multi-fallback-attempted.v1');
      expect(stamp).toBeTruthy();
      expect(Number.isFinite(Number(stamp))).toBe(true);
      expect(Number(stamp)).toBeGreaterThan(0);
    });

    it('skips multi-thread on init when the flag is RECENT', async () => {
      installMultiCapableEnv();
      // A returning user whose previous session discovered multi is broken
      // minutes ago — still trusted, so don't re-probe a known-bad bundle.
      localStorage.setItem('sfx.multi-fallback-attempted.v1', String(Date.now() - 60_000));

      const { stockfishEngine } = await getEngine();
      completeInit();
      await stockfishEngine.initialize();

      // Should go STRAIGHT to single — no multi-thread spawn.
      expect(workerConstructorCallCount).toBe(1);
    });

    it('RE-PROBES multi once the flag has aged out', async () => {
      installMultiCapableEnv();
      // Two days old. The failure that wrote this is long past, and a single
      // transient crash must not retire the fast engine forever (2026-08-01).
      localStorage.setItem(
        'sfx.multi-fallback-attempted.v1',
        String(Date.now() - 48 * 60 * 60 * 1000),
      );

      const { stockfishEngine } = await getEngine();
      completeInit();
      await stockfishEngine.initialize();

      // Multi is tried again, and the stale flag is cleared.
      expect(localStorage.getItem('sfx.multi-fallback-attempted.v1')).toBeNull();
    });

    it('expires a LEGACY permanent flag so stranded devices recover', async () => {
      installMultiCapableEnv();
      // The old format carried no timestamp and was read forever. These are
      // exactly the devices the bug stranded, so they must be freed, not
      // grandfathered into the slow engine.
      localStorage.setItem('sfx.multi-fallback-attempted.v1', '1');

      const { stockfishEngine } = await getEngine();
      completeInit();
      await stockfishEngine.initialize();

      expect(localStorage.getItem('sfx.multi-fallback-attempted.v1')).toBeNull();
    });

    it('does NOT retry a second time after the retry budget is spent', async () => {
      const { stockfishEngine } = await getEngine();
      const initPromise = stockfishEngine.initialize();
      initPromise.catch(() => undefined);
      await Promise.resolve();

      // Multi crashes → fall back to single.
      vi.useFakeTimers();
      mockWorker.instance.onerror?.(makeErrorEvent('multi crash'));
      vi.advanceTimersByTime(200);

      // Single OOMs → first retry (advance past dedup window first).
      vi.advanceTimersByTime(600);
      mockWorker.instance.onerror?.(
        makeErrorEvent('WebAssembly.instantiate(): Out of memory'),
      );
      vi.advanceTimersByTime(600);
      await Promise.resolve();

      const afterRetryCount = workerConstructorCallCount;
      // Retry ALSO OOMs — budget exhausted. Engine should reject the
      // init promise and NOT spawn another worker. Advance past
      // dedup window before emitting so the error is processed.
      vi.advanceTimersByTime(600);
      mockWorker.instance.onerror?.(
        makeErrorEvent('WebAssembly.instantiate(): Out of memory'),
      );
      vi.advanceTimersByTime(600);
      vi.useRealTimers();
      await Promise.resolve();

      expect(workerConstructorCallCount).toBe(afterRetryCount);
      await expect(initPromise).rejects.toThrow();
    });
  });
});

describe('analyzeWithBudget — the budget starts when the search dispatches', () => {
  it('a budgeted call queued behind another brain search does not stop or restart that search', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    // Answer the handshake so a respawned worker would init, but never answer
    // `go` on our own — the test emits bestmove by hand.
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'uci') queueMicrotask(() => mockWorker.emit('uciok'));
      if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
    });
    vi.useFakeTimers();
    const fenB = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const a = stockfishEngine.analyzeWithBudget(STARTING_FEN, 12, 300);
    const b = stockfishEngine.analyzeWithBudget(fenB, 12, 300);
    const settled = Promise.allSettled([a, b]);
    await vi.advanceTimersByTimeAsync(0);
    // Only A has dispatched; B waits on the brain mutex. The budget rides the
    // engine's own clock, sent with A's `go` (iOS engine reads 2026-10-20).
    expect(mockWorker.postMessageCalls.filter((m) => m.startsWith('go '))).toEqual(['go depth 12 movetime 300']);
    // Well past B's budget measured from CALL time (and short of A's own
    // grace): the old code posted a `stop` into A's search here. Nothing is
    // stopped now — the engine's clock ends each search.
    await vi.advanceTimersByTimeAsync(2_200);
    expect(mockWorker.postMessageCalls.filter((m) => m === 'stop').length).toBe(0);
    expect(mockWorker.instance.terminate).not.toHaveBeenCalled();
    // A answers; B now dispatches with its OWN full budget on its own clock.
    mockWorker.emit('info depth 12 score cp 20 pv e2e4');
    mockWorker.emit('bestmove e2e4');
    await vi.advanceTimersByTimeAsync(0);
    expect(mockWorker.postMessageCalls.filter((m) => m.startsWith('go ')).length).toBe(2);
    expect(mockWorker.postMessageCalls.filter((m) => m.startsWith('go ')).at(-1)).toBe('go depth 12 movetime 300');
    mockWorker.emit('info depth 12 score cp -10 pv g1f3');
    mockWorker.emit('bestmove g1f3');
    const [ra, rb] = await settled;
    expect(ra.status).toBe('fulfilled');
    expect(rb.status).toBe('fulfilled');
    vi.useRealTimers();
  });
});

describe('resolveWorkerUrl — the pool asks for the single-thread build', () => {
  it('singleThread routes an isolated+SAB host to the single build, never multi', async () => {
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const w = window as unknown as { crossOriginIsolated?: boolean };
    const prevIso = w.crossOriginIsolated;
    const prevSab = (globalThis as { SharedArrayBuffer?: unknown }).SharedArrayBuffer;
    Object.defineProperty(window, 'crossOriginIsolated', { value: true, configurable: true });
    (globalThis as { SharedArrayBuffer?: unknown }).SharedArrayBuffer = function SharedArrayBufferStub(): void { /* stub */ };
    try {
      const single = resolveWorkerUrl({ singleThread: true });
      const def = resolveWorkerUrl();
      if (def.variant === 'multi') {
        expect(single.variant).toBe('single');
        expect(single.url).toContain('lite-single');
      } else {
        // iOS / no-SIMD hosts never resolve to multi; singleThread changes nothing there.
        expect(single).toEqual(def);
      }
    } finally {
      Object.defineProperty(window, 'crossOriginIsolated', { value: prevIso, configurable: true });
      (globalThis as { SharedArrayBuffer?: unknown }).SharedArrayBuffer = prevSab;
    }
  });
});

// ─── ONE READ, ITS OWN LINES (walk 2026-10-07) ────────────────────────────────
// A Learn verdict said "Bc5 keeps you clearly on top" to a Black student with
// White +2.9 on the board: a search on another board streamed into the open
// read and its score was flipped by the read's side to move.
describe('a read never takes another position\'s lines', () => {
  it('uciBelongsToSideToMove reads the side to move off the board', async () => {
    const { uciBelongsToSideToMove } = await import('./stockfishEngine');
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(uciBelongsToSideToMove(STARTING_FEN, 'e2e4')).toBe(true);
    expect(uciBelongsToSideToMove(STARTING_FEN, 'e7e5')).toBe(false); // Black's pawn, White to move
    expect(uciBelongsToSideToMove(STARTING_FEN, 'e3e4')).toBe(false); // empty square
    expect(uciBelongsToSideToMove(afterE4, 'e7e5')).toBe(true);
    expect(uciBelongsToSideToMove(afterE4, 'g1f3')).toBe(false);
    expect(uciBelongsToSideToMove(afterE4, '(none)')).toBe(true);
    expect(uciBelongsToSideToMove(afterE4, 'e7e8q')).toBe(true);
  });

  it('a read of a Black-to-move board ignores a White search\'s lines and waits for its own', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
      if (msg.startsWith('go ')) {
        queueMicrotask(() => {
          // Another search's output arrives first (White to move, +2.87 from White's view).
          mockWorker.emit('info depth 14 multipv 1 score cp 287 pv g1f3 b8c6');
          mockWorker.emit('bestmove g1f3');
          // Then this read's own.
          mockWorker.emit('info depth 14 multipv 1 score cp -40 pv e7e5 g1f3');
          mockWorker.emit('bestmove e7e5');
        });
      }
    });
    const read = await stockfishEngine.analyzePosition(afterE4, 14);
    expect(read.bestMove).toBe('e7e5');
    expect(read.topLines[0].moves[0]).toBe('e7e5');
    expect(read.evaluation).toBe(40); // Black's −40, from White's view
  });

  it('getBestMove ignores another search\'s bestmove', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg.startsWith('go movetime')) {
        queueMicrotask(() => {
          mockWorker.emit('bestmove e7e5'); // a Black move: not this White board's answer
          mockWorker.emit('bestmove g1f3');
        });
      }
    });
    expect(await stockfishEngine.getBestMove(STARTING_FEN, 500)).toBe('g1f3');
  });

  it('the coach\'s move search waits for an open read before it touches the worker', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
      if (msg.startsWith('go movetime')) queueMicrotask(() => mockWorker.emit('bestmove d2d4'));
      // `go depth` (the read) is answered by hand below.
    });
    const read = stockfishEngine.analyzePosition(STARTING_FEN, 14);
    await vi.waitFor(() => expect(mockWorker.postMessageCalls.some((m) => m.startsWith('go depth'))).toBe(true));
    const move = stockfishEngine.getBestMove(STARTING_FEN, 500);
    await new Promise((r) => setTimeout(r, 60));
    // Still never a `go` into an open read: the read is stopped (set aside,
    // iOS engine reads 2026-10-20) and the move search waits for its answer.
    expect(mockWorker.postMessageCalls.some((m) => m.startsWith('go movetime'))).toBe(false);
    expect(mockWorker.postMessageCalls.filter((m) => m === 'stop')).toHaveLength(1);
    mockWorker.emit('info depth 6 multipv 1 score cp 30 pv e2e4 e7e5');
    mockWorker.emit('bestmove e2e4');
    expect(await move).toBe('d2d4');
    // The read runs again after the move search, and answers in full.
    await vi.waitFor(() => expect(mockWorker.postMessageCalls.filter((m) => m.startsWith('go depth')).length).toBe(2));
    mockWorker.emit('info depth 14 multipv 1 score cp 30 pv e2e4 e7e5');
    mockWorker.emit('bestmove e2e4');
    const r = await read;
    expect(r.bestMove).toBe('e2e4');
    expect(r.depth).toBe(14);
  });
});

describe('a question supersedes the reads waiting in line (Learn trace, 2026-10-19)', () => {
  it('reads queued before supersedeWaiting reject as interrupted; reads after it run', async () => {
    vi.resetModules();
    const mod = await import('./stockfishEngine');
    const engine = mod.stockfishEngine as unknown as {
      analyzePosition: (f: string, d: number) => Promise<unknown>;
      supersedeWaiting: () => void;
      _dispatchAnalysis: (...a: unknown[]) => Promise<unknown>;
    };
    let releaseFirst!: () => void;
    const dispatched: string[] = [];
    engine._dispatchAnalysis = (fen: unknown) => {
      dispatched.push(String(fen));
      if (dispatched.length === 1) return new Promise((r) => { releaseFirst = () => r({ bestMove: 'e2e4' }); });
      return Promise.resolve({ bestMove: 'e2e4' });
    };
    const FEN = (n: number): string => `8/8/8/8/8/8/8/K6k w - - 0 ${n}`;
    const first = engine.analyzePosition(FEN(1), 9);
    const stale = engine.analyzePosition(FEN(2), 9);
    await Promise.resolve();
    engine.supersedeWaiting();
    const question = engine.analyzePosition(FEN(3), 9);
    releaseFirst();
    await first;
    await expect(stale).rejects.toThrow('Analysis interrupted by new request');
    await expect(question).resolves.toBeTruthy();
    expect(dispatched).not.toContain(FEN(2));
  });
});

// #2 root cause 4 (2026-10-20): a budget `stop()` ends a depth-14 ask at depth 6.
// Filed as depth 14, that read later answered a real depth-14 ask — Kg5's 115
// in the record came from two cut-short reads. It is filed under the depth the
// search REACHED, so it can answer only asks at or below that.
describe('a budget-cut read is cached under the depth it reached', () => {
  const KG5 = '5k2/1p6/3p2P1/p7/3nPK2/2N5/8/8 w - - 4 39';
  it('a depth-14 ask stopped at depth 6 never answers a later depth-14 ask', async () => {
    const { stockfishEngine } = await getEngine();
    const { stockfishCache: engineCache } = await import('./stockfishCache');
    await initEngine(stockfishEngine);
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
      if (msg.startsWith('go')) {
        queueMicrotask(() => mockWorker.emit('info depth 6 seldepth 8 multipv 1 score cp -17 nodes 1000 pv e4e5 d6e5'));
        // The engine's own clock (`movetime`) ends the search.
        const clock = Number(/movetime (\d+)/.exec(msg)?.[1] ?? 0);
        setTimeout(() => mockWorker.emit('bestmove e4e5'), clock);
      }
    });
    vi.useFakeTimers();
    const read = stockfishEngine.analyzeWithBudget(KG5, 14, 300);
    await vi.advanceTimersByTimeAsync(400);
    const result = await read;
    vi.useRealTimers();
    expect(result.depth).toBe(6);
    expect(engineCache.get(KG5, 14)).toBeUndefined();
    expect(engineCache.get(KG5, 6)?.depth).toBe(6);
  });
});

describe('engineLedger — the engine records its own timeline (Learn speed, 2026-10-20)', () => {
  it('a search records asked, started, done and the depth it reached; a repeat is shared', async () => {
    const { stockfishEngine } = await getEngine();
    const { engineLedger } = await import('./engineLedger');
    await initEngine(stockfishEngine);
    scheduleAnalysisResponse({ lines: [{ multipv: 1, cp: 30, pv: 'e2e4 e7e5' }], bestmove: 'e2e4' });
    await stockfishEngine.analyzePosition(STARTING_FEN, 18);
    const e = engineLedger().at(-1);
    expect(e?.kind).toBe('read');
    expect(e?.outcome).toBe('done');
    expect(e?.startedAt).not.toBeNull();
    expect((e?.doneAt ?? 0) >= (e?.startedAt ?? Infinity)).toBe(true);
    expect(e?.depthReached).toBe(18);
    // The same read again is answered from the cache: no search of its own.
    await stockfishEngine.analyzePosition(STARTING_FEN, 18);
    expect(engineLedger().at(-1)?.outcome).toBe('shared');
  });
});

describe('analyzeBounded — a read stopped at its budget (Learn speed, 2026-10-20)', () => {
  it('sends the budget as the search\'s own clock, and settles with what it reached', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    const pmMock = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pmMock.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
      if (msg.startsWith('go')) {
        queueMicrotask(() => mockWorker.emit('info depth 15 seldepth 20 multipv 1 score cp 30 nodes 1000 pv e2e4 e7e5'));
        const clock = Number(/movetime (\d+)/.exec(msg)?.[1] ?? 0);
        setTimeout(() => mockWorker.emit('bestmove e2e4'), clock);
      }
    });
    vi.useFakeTimers();
    const p = stockfishEngine.analyzeBounded(STARTING_FEN, 18, { searchmoves: 'e2e4 d2d4' }, 500, true);
    await vi.advanceTimersByTimeAsync(100);
    // The budget is the engine's clock: a 30 s depth-18 price search can no
    // longer hold the engine, and no `stop` can land on another search.
    expect(mockWorker.postMessageCalls).toContain('go depth 18 movetime 500 searchmoves e2e4 d2d4');
    await vi.advanceTimersByTimeAsync(500);
    expect(mockWorker.postMessageCalls.includes('stop')).toBe(false);
    const r = await p;
    vi.useRealTimers();
    expect(r.depth).toBe(15);
    expect(r.topLines[0]?.searchedShort).toBe(true);
  });
});

// iOS ENGINE READS (2026-10-20). On the iPhone's asm engine a read costs
// seconds, so WHICH read runs, and when, decides whether a Learn move is
// graded at all (1 of 15 on the emulated engine before this). Each test below
// fails on the code before it.
describe('iOS engine reads: the coach\'s move, the holds, the clock and the board left behind', () => {
  const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  const AFTER_E4E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  const wait = (ms = 0): Promise<void> => new Promise((r) => { setTimeout(r, ms); });
  /** A live engine that answers the handshake; each search is answered by hand. */
  function manualEngine(): void {
    const pm = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pm.mockImplementation((msg: string) => {
      mockWorker.postMessageCalls.push(msg);
      if (msg === 'uci') queueMicrotask(() => mockWorker.emit('uciok'));
      if (msg === 'isready') queueMicrotask(() => mockWorker.emit('readyok'));
    });
  }
  const gos = (): string[] => mockWorker.postMessageCalls.filter((m) => m.startsWith('go '));
  const lastPosition = (): string | undefined => [...mockWorker.postMessageCalls].reverse().find((m) => m.startsWith('position fen '))?.slice('position fen '.length);
  function answer(depth: number, uci: string): void {
    mockWorker.emit(`info depth ${depth} multipv 1 score cp 20 pv ${uci}`);
    mockWorker.emit(`bestmove ${uci}`);
  }

  it('a budgeted read sends its budget as the engine\'s own clock, started by its `go`', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    manualEngine();
    const p = stockfishEngine.analyzeWithBudget(AFTER_E4E5, 14, 900);
    await wait();
    // Old: `go depth 14 movetime 8000` plus a JS stop armed before the read
    // waited in line — a queued read lost its budget and its stop hit another.
    expect(gos().at(-1)).toBe('go depth 14 movetime 900');
    answer(14, 'g1f3');
    await p;
  });

  it('the coach\'s move claims the worker first: the read in flight is set aside and runs again after it; a later read waits', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    manualEngine();
    const a = stockfishEngine.analyzePosition(AFTER_E4, 14);
    await wait();
    expect(gos()).toHaveLength(1);
    const move = stockfishEngine.getBestMove(STARTING_FEN, 500);
    await wait();
    const b = stockfishEngine.analyzePosition(AFTER_E4E5, 14);
    await wait();
    // A is stopped for the coach's move (old: waited for it, then for B, 8 s).
    expect(mockWorker.postMessageCalls.filter((m) => m === 'stop')).toHaveLength(1);
    answer(5, 'e7e5'); // A's stopped search reports
    await wait(60);
    // The coach's move runs next — not B, not A again.
    expect(gos().at(-1)).toBe('go movetime 500');
    mockWorker.emit('bestmove e2e4');
    expect(await move).toBe('e2e4');
    await wait(10);
    // A runs again, in its place ahead of B — and is answered in full, never
    // with the depth-5 cut (a re-priced record row stamped from depth 5).
    expect(lastPosition()).toBe(AFTER_E4);
    answer(14, 'e7e5');
    expect((await a).depth).toBe(14);
    await wait(10);
    expect(lastPosition()).toBe(AFTER_E4E5);
    answer(14, 'g1f3');
    await b;
  });

  it('holds take turns: a second hold never interrupts the first hold\'s search', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    manualEngine();
    const h1 = stockfishEngine.holdForQuestion((e) => e.analyzePosition(AFTER_E4, 14));
    const h2 = stockfishEngine.holdForQuestion((e) => e.analyzePosition(AFTER_E4E5, 14));
    await wait();
    expect(gos()).toHaveLength(1);
    expect(lastPosition()).toBe(AFTER_E4);
    answer(14, 'e7e5');
    // Old: h2 dispatched at once and h1's search was interrupted — the price of
    // the move came back empty when the student asked a question meanwhile.
    expect((await h1).depth).toBe(14);
    await wait();
    expect(lastPosition()).toBe(AFTER_E4E5);
    answer(14, 'g1f3');
    expect((await h2).bestMove).toBe('g1f3');
    expect(stockfishEngine.isHeldForQuestion()).toBe(false);
  });

  it('a background read set aside for a hold runs again after it — it is never rejected or answered shallow', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    manualEngine();
    const bg = stockfishEngine.analyzePosition(AFTER_E4, 14);
    await wait();
    const h = stockfishEngine.holdForQuestion((e) => e.analyzePosition(AFTER_E4E5, 14));
    await wait();
    expect(lastPosition()).toBe(AFTER_E4E5);
    answer(14, 'g1f3');
    expect((await h).bestMove).toBe('g1f3');
    await wait();
    expect(lastPosition()).toBe(AFTER_E4);
    answer(14, 'e7e5');
    // Old: rejected "Analysis interrupted by new request" — the slip record's
    // read was lost whenever the move's price took the engine.
    expect((await bg).depth).toBe(14);
  });

  it('a read that ran to the engine\'s own clock answers the next ask of that board; a caller-cut read does not', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    manualEngine();
    const first = stockfishEngine.analyzePosition(AFTER_E4E5, 14);
    await wait();
    answer(12, 'g1f3'); // the variant's clock ended it at depth 12 — no stop sent
    await first;
    const searched = gos().length;
    // Old: a second full search of the same board, reaching the same depth.
    const again = await stockfishEngine.analyzePosition(AFTER_E4E5, 14);
    expect(gos().length).toBe(searched);
    expect(again.depth).toBe(12);
    expect(again.topLines[0]?.searchedShort).toBe(true);
    // A caller's shorter budget is not the engine's ceiling (#2 root cause 4).
    const cut = stockfishEngine.analyzeWithBudget(AFTER_E4, 14, 300);
    await wait();
    answer(6, 'e7e5');
    await cut;
    const n = gos().length;
    const full = stockfishEngine.analyzePosition(AFTER_E4, 14);
    await wait();
    expect(gos().length).toBe(n + 1);
    answer(14, 'e7e5');
    await full;
  });

  it('restartIfUnresponsive restarts only a worker that does not answer isready', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    manualEngine();
    expect(await stockfishEngine.restartIfUnresponsive('test')).toBe(false);
    expect(mockWorker.instance.terminate).not.toHaveBeenCalled();
    const pm = mockWorker.instance.postMessage as ReturnType<typeof vi.fn>;
    pm.mockImplementation((msg: string) => { mockWorker.postMessageCalls.push(msg); });
    vi.useFakeTimers();
    const r = stockfishEngine.restartIfUnresponsive('test');
    await vi.advanceTimersByTimeAsync(3_100);
    expect(await r).toBe(true);
    expect(mockWorker.instance.terminate).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('an engine without UCI_LimitStrength (the asm build) gets the caller\'s Skill Level for its move — never an ignored Elo cap at Skill 20', async () => {
    const { stockfishEngine } = await getEngine();
    // The asm build lists its options at `uci`, and the Elo cap is not one.
    queueMicrotask(() => {
      mockWorker.emit('option name Skill Level type spin default 20 min 0 max 20');
      mockWorker.emit('option name MultiPV type spin default 1 min 1 max 500');
    });
    await initEngine(stockfishEngine);
    expect(stockfishEngine.supportsOption('UCI_LimitStrength')).toBe(false);
    manualEngine();
    const move = stockfishEngine.getBestMove(STARTING_FEN, 500, 7, 1500);
    await wait(60);
    // Old: `UCI_Elo 1500` (answered "No such option") + `Skill Level 20`.
    expect(mockWorker.postMessageCalls).toContain('setoption name Skill Level value 7');
    expect(mockWorker.postMessageCalls.some((m) => /UCI_Elo|UCI_LimitStrength/.test(m))).toBe(false);
    mockWorker.emit('bestmove e2e4');
    expect(await move).toBe('e2e4');
  });

  it('an engine that lists the Elo cap still gets it', async () => {
    const { stockfishEngine } = await getEngine();
    queueMicrotask(() => {
      mockWorker.emit('option name UCI_LimitStrength type check default false');
      mockWorker.emit('option name UCI_Elo type spin default 1320 min 1320 max 3190');
    });
    await initEngine(stockfishEngine);
    manualEngine();
    const move = stockfishEngine.getBestMove(STARTING_FEN, 500, 7, 1500);
    await wait(60);
    expect(mockWorker.postMessageCalls).toContain('setoption name UCI_LimitStrength value true');
    mockWorker.emit('bestmove e2e4');
    await move;
  });

  it('evalBoard on the asm build answers at once — it has no per-piece table to wait 2.5 s for', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    (stockfishEngine as unknown as { workerVariant: string }).workerVariant = 'asm';
    vi.useFakeTimers();
    let raw: string | null = null;
    void stockfishEngine.evalBoard(STARTING_FEN).then((r) => { raw = r; });
    mockWorker.emit('      Total |  ----  ---- |  ----  ---- | -0.59 -0.23');
    mockWorker.emit('Total evaluation: -0.50 (white side)');
    await vi.advanceTimersByTimeAsync(10);
    // Old: waited for "Final evaluation" (asm never prints it) — 2.5 s, every call.
    expect(raw).toBe('');
    vi.useRealTimers();
  });

  it('a read whose asker has moved on is dropped before it reaches the worker', async () => {
    const { stockfishEngine } = await getEngine();
    await initEngine(stockfishEngine);
    manualEngine();
    const a = stockfishEngine.analyzePosition(AFTER_E4, 14);
    await wait();
    const left = new AbortController();
    const b = stockfishEngine.analyzePosition(AFTER_E4E5, 14, undefined, 'brain', { signal: left.signal });
    const dropped = expect(b).rejects.toThrow('Analysis interrupted by new request');
    left.abort();
    answer(14, 'e7e5');
    await a;
    await dropped;
    expect(mockWorker.postMessageCalls).not.toContain(`position fen ${AFTER_E4E5}`);
  });
});
