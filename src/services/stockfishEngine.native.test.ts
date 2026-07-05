/**
 * Native iOS Stockfish transport seam.
 *
 * Verifies that when Capacitor reports native iOS + the StockfishNative plugin
 * is available, the engine drives the UCI handshake + analysis through the
 * native plugin (NativeStockfishTransport) instead of a Web Worker — with the
 * whole UCI state machine unchanged. Uses a mock plugin that emulates SF's UCI
 * responses. Kept in its own file so the module-level Capacitor/plugin mocks
 * don't leak into the Worker-based suite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- mock the native plugin: a tiny UCI responder -------------------------
interface MockPlugin {
  _listener: ((data: { line: string }) => void) | null;
  _cmds: string[];
  _exited: boolean;
  addListener: (
    ev: 'output',
    cb: (data: { line: string }) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
  start: () => Promise<void>;
  cmd: (opts: { cmd: string }) => Promise<void>;
  exit: () => Promise<void>;
  _emit: (line: string) => void;
}

const mockPlugin: MockPlugin = {
  _listener: null,
  _cmds: [],
  _exited: false,
  async addListener(_ev, cb) {
    mockPlugin._listener = cb;
    return { remove: async () => { mockPlugin._listener = null; } };
  },
  async start() { /* engine boots instantly in the mock */ },
  async cmd({ cmd }) {
    mockPlugin._cmds.push(cmd);
    // Emulate Stockfish's UCI responses.
    if (cmd === 'uci') queueMicrotask(() => mockPlugin._emit('uciok'));
    else if (cmd === 'isready') queueMicrotask(() => mockPlugin._emit('readyok'));
    else if (cmd.startsWith('go ')) {
      queueMicrotask(() => {
        mockPlugin._emit('info depth 18 multipv 1 score cp 25 pv e2e4 e7e5');
        mockPlugin._emit('bestmove e2e4');
      });
    }
  },
  async exit() { mockPlugin._exited = true; },
  _emit(line) { mockPlugin._listener?.({ line }); },
};

vi.mock('capacitor-stockfish-native', () => ({ StockfishNative: mockPlugin }));
vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({}),
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    isPluginAvailable: () => true,
  },
}));

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

async function getEngine() {
  vi.resetModules();
  const mod = await import('./stockfishEngine');
  return mod.stockfishEngine;
}

beforeEach(() => {
  mockPlugin._listener = null;
  mockPlugin._cmds = [];
  mockPlugin._exited = false;
  // The engine only constructs a Worker on non-native paths; stub it anyway
  // so a stray construction can't throw in jsdom.
  vi.stubGlobal('Worker', class { postMessage() {} terminate() {} addEventListener() {} removeEventListener() {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('native iOS Stockfish transport', () => {
  it('routes to the ios-native variant and completes the UCI handshake', async () => {
    const engine = await getEngine();
    await engine.initialize();
    expect(engine.status).toBe('ready');
    // The handshake ran through the plugin: uci → uciok, isready → readyok.
    expect(mockPlugin._cmds).toContain('uci');
    expect(mockPlugin._cmds).toContain('isready');
  });

  it('analyzes a position through the native plugin', async () => {
    const engine = await getEngine();
    await engine.initialize();
    const analysis = await engine.analyzePosition(STARTING_FEN, 18);
    expect(analysis.bestMove).toBe('e2e4');
    expect(analysis.evaluation).toBe(25);
    // A `go` command was actually sent to the native engine.
    expect(mockPlugin._cmds.some((c) => c.startsWith('go '))).toBe(true);
  });

  it('tears the native engine down via the plugin exit() on destroy', async () => {
    const engine = await getEngine();
    await engine.initialize();
    engine.destroy();
    // terminate() → plugin.exit() (async, fire-and-forget) — let it settle.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockPlugin._exited).toBe(true);
  });
});
