/**
 * WHICH ENGINE BUILD DOES THE ANALYSIS POOL SPAWN ON iOS?
 *
 * `spawnDedicatedWorker` hardcoded `/stockfish/stockfish-18-lite-single.js` —
 * the SIMD WASM build that `call_indirect`-traps on iOS WebKit, and the exact
 * file `resolveWorkerUrl` routes iOS away from. It crash-stormed a device with
 * 276 traps in four minutes on /games/import, and it had NO test at all.
 *
 * The prod audit added for it (audit-analysis-pool-engine-prod) runs in Linux
 * Chromium, where the correct answer is `multi` — so it proves the pool ASKS
 * the resolver, and can never prove the pool gets `asm` on an iPhone. That is
 * the entire point of the fix and the one thing a web audit cannot reach.
 *
 * This closes it without a device: force Capacitor to report iOS, let the REAL
 * resolver run (the sibling suite mocks stockfishEngine wholesale, which is why
 * the pool never surfaces there), and read the URLs `new Worker()` was actually
 * constructed with.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';

// Capacitor reports native iOS — `isIosSafari()` treats getPlatform() as
// authoritative and UA-independent, which is the whole reason the WKWebView's
// spoofed desktop-Safari UA cannot route the app back onto a WASM build.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: (): string => 'ios',
    isNativePlatform: (): boolean => true,
    isPluginAvailable: (): boolean => false, // no native plugin → the pool's JS path
  },
  registerPlugin: (): Record<string, never> => ({}),
}));

vi.mock('./weaknessAnalyzer', () => ({ computeWeaknessProfile: vi.fn() }));
vi.mock('./mistakePuzzleService', () => ({
  generateMistakePuzzlesFromGame: vi.fn().mockResolvedValue(0),
}));

const workerUrls: string[] = [];

beforeEach(async () => {
  workerUrls.length = 0;
  vi.stubGlobal(
    'Worker',
    class MockWorker {
      constructor(url?: string | URL) {
        workerUrls.push(String(url ?? ''));
      }
      postMessage(): void { /* never answers — we only need the URL */ }
      terminate(): void { /* no-op */ }
      addEventListener(): void { /* no-op */ }
      removeEventListener(): void { /* no-op */ }
      onmessage: unknown = null;
      onerror: unknown = null;
    },
  );
  await db.games.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('analysis worker pool — engine build on iOS', () => {
  it('the resolver pins iOS to the asm.js build', async () => {
    const { resolveWorkerUrl } = await import('./stockfishEngine');
    const resolved = resolveWorkerUrl();
    expect(resolved.variant).toBe('asm');
    expect(resolved.url).toBe('/stockfish/stockfish-asm.js');
  });

  it('the POOL spawns that build — never the WASM single build that traps', async () => {
    // One unanalyzed game is all the batch needs to spawn its workers.
    await db.games.add(buildGameRecord({
      id: 'pool-ios-1',
      pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7',
      annotations: undefined,
    }));

    const { analyzeAllGames } = await import('./gameAnalysisService');
    // Fire and DON'T await: the mock workers never signal ready, so the batch
    // will time out and fall back. We only need the URLs it asked for, which
    // are captured at construction.
    void analyzeAllGames();
    await vi.waitFor(() => {
      expect(workerUrls.length).toBeGreaterThan(0);
    }, { timeout: 10_000 });

    // THE REGRESSION GUARD. Reintroducing a hardcoded URL fails here.
    expect(workerUrls.every((u) => u.includes('stockfish-asm.js')),
      `pool spawned: ${[...new Set(workerUrls)].join(', ')}`).toBe(true);
    expect(workerUrls.some((u) => u.includes('stockfish-18-lite-single.js'))).toBe(false);
    expect(workerUrls.some((u) => u.includes('stockfish-18-lite.js'))).toBe(false);
  }, 15_000);
});
