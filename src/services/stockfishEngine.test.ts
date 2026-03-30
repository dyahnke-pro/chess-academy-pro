import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StockfishAnalysis } from '../types';

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

// Stub the global Worker as a class that can be called with `new`
beforeEach(() => {
  mockWorker = createMockWorker();
  workerConstructorCallCount = 0;

  // Use a class so `new Worker(...)` works properly
  vi.stubGlobal(
    'Worker',
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class MockWorkerClass {
      constructor() {
        workerConstructorCallCount++;
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

// ---------------------------------------------------------------------------
// Helper: complete init handshake
// ---------------------------------------------------------------------------

function completeInit(): void {
  queueMicrotask(() => {
    mockWorker.emit('readyok');
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

function emitAnalysisResponse(options?: {
  mateScore?: { value: number; multipv?: number };
  lines?: Array<{ multipv: number; cp: number; pv: string }>;
  bestmove?: string;
}): void {
  const bestmove = options?.bestmove ?? 'e2e4 ponder e7e5';

  if (options?.mateScore) {
    const mv = options.mateScore.multipv ?? 1;
    mockWorker.emit(
      `info depth 15 multipv ${mv} score mate ${options.mateScore.value} pv e2e4 e7e5 d1h5`,
    );
  }

  if (options?.lines) {
    for (const line of options.lines) {
      mockWorker.emit(
        `info depth 18 multipv ${line.multipv} score cp ${line.cp} pv ${line.pv}`,
      );
    }
  } else if (!options?.mateScore) {
    mockWorker.emit(
      'info depth 18 multipv 1 score cp 30 pv e2e4 e7e5 g1f3 b8c6',
    );
    mockWorker.emit(
      'info depth 18 multipv 2 score cp 20 pv d2d4 d7d5 c2c4',
    );
    mockWorker.emit(
      'info depth 18 multipv 3 score cp 10 pv c2c4 e7e5 b1c3',
    );
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

      expect(mockWorker.postMessageCalls).toContain('go depth 20');
    });

    it('uses default depth 18 when not specified', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(mockWorker.postMessageCalls).toContain('go depth 18');
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

    it('sends ucinewgame before analysis', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse();
      await stockfishEngine.analyzePosition(STARTING_FEN);

      const ucinewgameIdx =
        mockWorker.postMessageCalls.indexOf('ucinewgame');
      const positionIdx = mockWorker.postMessageCalls.indexOf(
        `position fen ${STARTING_FEN}`,
      );

      expect(ucinewgameIdx).toBeGreaterThanOrEqual(0);
      expect(positionIdx).toBeGreaterThan(ucinewgameIdx);
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

    it('sets evaluation to 30000 for positive mate score', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        mateScore: { value: 5, multipv: 1 },
        bestmove: 'e2e4',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.evaluation).toBe(30000);
    });

    it('sets evaluation to -30000 for negative mate score', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      scheduleAnalysisResponse({
        mateScore: { value: -3, multipv: 1 },
        bestmove: 'e1d1',
      });

      const analysis = await stockfishEngine.analyzePosition(STARTING_FEN);

      expect(analysis.evaluation).toBe(-30000);
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
          queueMicrotask(() => mockWorker.emit('bestmove e2e4'));
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
      queueMicrotask(() => newMockWorker.emit('readyok'));
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
    it('sends stop when a second analyzePosition interrupts the first', async () => {
      const { stockfishEngine } = await getEngine();
      await initEngine(stockfishEngine);

      // First analysis: respond to isready but let "go" hang
      const pmMock = mockWorker.instance.postMessage as ReturnType<
        typeof vi.fn
      >;
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
      });

      const firstAnalysis = stockfishEngine.analyzePosition(STARTING_FEN);

      // Let microtasks settle so first analysis is fully set up
      await new Promise((r) => setTimeout(r, 10));

      // Second analysis: respond to everything
      pmMock.mockImplementation((msg: string) => {
        mockWorker.postMessageCalls.push(msg);
        if (msg === 'isready') {
          queueMicrotask(() => mockWorker.emit('readyok'));
        }
        if (msg.startsWith('go depth')) {
          queueMicrotask(() => emitAnalysisResponse({ bestmove: 'd2d4' }));
        }
      });

      const secondFen =
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const secondAnalysis = stockfishEngine.analyzePosition(secondFen);

      await expect(firstAnalysis).rejects.toThrow(
        'Analysis interrupted by new request',
      );

      const result = await secondAnalysis;
      expect(result.bestMove).toBe('d2d4');
      expect(mockWorker.postMessageCalls).toContain('stop');
    });

    it('rejects the previous pending analysis', async () => {
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

      const first = stockfishEngine.analyzePosition(STARTING_FEN);

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

      await expect(initPromise).rejects.toThrow(
        'Worker failed to load: WASM load failed',
      );
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
            emitAnalysisResponse({ bestmove: 'e2e4' });
          });
        }
      });

      const p1 = stockfishEngine.queueAnalysis(STARTING_FEN).then((r) => {
        order.push('p1-resolved');
        return r;
      });
      const p2 = stockfishEngine.queueAnalysis(STARTING_FEN).then((r) => {
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
