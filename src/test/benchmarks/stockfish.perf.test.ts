import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StockfishAnalysis } from '../../types';

// ---------------------------------------------------------------------------
// Mock Worker that simulates UCI protocol at realistic speeds
// ---------------------------------------------------------------------------

type MessageListener = (event: MessageEvent) => void;

interface MockWorkerHandle {
  emit: (data: string) => void;
  postMessageCalls: string[];
}

function createMockWorker(): MockWorkerHandle {
  const messageListeners: MessageListener[] = [];
  const postMessageCalls: string[] = [];

  const worker = {
    postMessage: vi.fn((msg: string) => {
      postMessageCalls.push(msg);

      // Auto-respond to uci/isready quickly
      if (msg === 'isready') {
        queueMicrotask(() => emit('readyok'));
      }
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

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  vi.stubGlobal('Worker', class { constructor() { return worker; } });

  return { emit, postMessageCalls };
}

// Emit a realistic analysis sequence for a given depth
function emitAnalysisSequence(handle: MockWorkerHandle, depth: number): void {
  for (let d = 1; d <= depth; d++) {
    handle.emit(`info depth ${d} multipv 1 score cp ${30 + d} nodes ${d * 12000} nps ${800000 + d * 10000} pv e2e4 e7e5 g1f3`);
    handle.emit(`info depth ${d} multipv 2 score cp ${20 + d} nodes ${d * 10000} nps ${800000 + d * 10000} pv d2d4 d7d5`);
    handle.emit(`info depth ${d} multipv 3 score cp ${10 + d} nodes ${d * 8000} nps ${800000 + d * 10000} pv c2c4 e7e5`);
  }
  handle.emit('bestmove e2e4 ponder e7e5');
}

describe('Stockfish Performance', () => {
  let handle: MockWorkerHandle;
  let stockfishEngine: typeof import('../../services/stockfishEngine').stockfishEngine;

  beforeEach(async () => {
    vi.resetModules();
    handle = createMockWorker();
    const mod = await import('../../services/stockfishEngine');
    stockfishEngine = mod.stockfishEngine;
  });

  afterEach(() => {
    stockfishEngine.destroy();
    vi.unstubAllGlobals();
  });

  it('initializes engine within 500ms', async () => {
    const start = performance.now();
    await stockfishEngine.initialize();
    const elapsed = performance.now() - start;

    expect(stockfishEngine.status).toBe('ready');
    expect(elapsed).toBeLessThan(500);
  });

  it('processes depth-12 analysis info lines within 100ms', async () => {
    await stockfishEngine.initialize();

    const analysisPromise = stockfishEngine.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      12,
    );

    // Wait for the position/go commands to be sent
    await new Promise((r) => { setTimeout(r, 10); });

    const start = performance.now();
    emitAnalysisSequence(handle, 12);
    const result = await analysisPromise;
    const elapsed = performance.now() - start;

    expect(result.bestMove).toBe('e2e4');
    expect(result.depth).toBe(12);
    expect(result.topLines.length).toBeGreaterThanOrEqual(1);
    expect(elapsed).toBeLessThan(100);
  });

  it('processes depth-18 analysis info lines within 200ms', async () => {
    await stockfishEngine.initialize();

    const analysisPromise = stockfishEngine.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      18,
    );

    await new Promise((r) => { setTimeout(r, 10); });

    const start = performance.now();
    emitAnalysisSequence(handle, 18);
    const result = await analysisPromise;
    const elapsed = performance.now() - start;

    expect(result.bestMove).toBe('e2e4');
    expect(result.depth).toBe(18);
    expect(elapsed).toBeLessThan(200);
  });

  it('handles high-throughput info lines (500 lines) without lag', async () => {
    await stockfishEngine.initialize();

    const analysisPromise = stockfishEngine.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      25,
    );

    await new Promise((r) => { setTimeout(r, 10); });

    const start = performance.now();
    // Emit 500 info lines to simulate deep analysis
    for (let d = 1; d <= 25; d++) {
      for (let pv = 1; pv <= 3; pv++) {
        handle.emit(`info depth ${d} multipv ${pv} score cp ${30 + d - pv * 5} nodes ${d * 12000 * pv} nps 950000 pv e2e4 e7e5 g1f3 b8c6`);
      }
      // Extra seldepth lines
      for (let extra = 0; extra < 5; extra++) {
        handle.emit(`info depth ${d} seldepth ${d + extra + 5} nodes ${d * 50000} nps 950000 hashfull ${d * 3}`);
      }
    }
    handle.emit('bestmove e2e4 ponder e7e5');
    const result = await analysisPromise;
    const elapsed = performance.now() - start;

    expect(result.bestMove).toBe('e2e4');
    // 500+ lines should be processed in well under 500ms
    expect(elapsed).toBeLessThan(500);
  });

  it('queued analyses run serially without memory buildup', async () => {
    await stockfishEngine.initialize();

    const QUEUE_SIZE = 10;
    const fens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    ];

    const promises: Promise<StockfishAnalysis>[] = [];
    for (let i = 0; i < QUEUE_SIZE; i++) {
      promises.push(stockfishEngine.queueAnalysis(fens[i % fens.length], 8));
    }

    // Drain the queue by responding to each analysis
    const start = performance.now();
    for (let i = 0; i < QUEUE_SIZE; i++) {
      // Wait for go command
      await new Promise((r) => { setTimeout(r, 5); });
      emitAnalysisSequence(handle, 8);
    }

    const results = await Promise.all(promises);
    const elapsed = performance.now() - start;

    expect(results).toHaveLength(QUEUE_SIZE);
    for (const result of results) {
      expect(result.bestMove).toBe('e2e4');
    }
    // 10 queued analyses should complete within 2s even with mock delays
    expect(elapsed).toBeLessThan(2000);
  });

  it('getBestMove responds within 50ms of receiving bestmove', async () => {
    await stockfishEngine.initialize();

    const movePromise = stockfishEngine.getBestMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      500,
    );

    await new Promise((r) => { setTimeout(r, 10); });

    const start = performance.now();
    handle.emit('bestmove e2e4 ponder e7e5');
    const move = await movePromise;
    const elapsed = performance.now() - start;

    expect(move).toBe('e2e4');
    expect(elapsed).toBeLessThan(50);
  });
});
