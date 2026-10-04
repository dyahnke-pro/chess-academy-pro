// Walk 2026-10-04 #17: "the first Analyze tap stalled at 5 games with no error;
// a second tap ran." Two code paths ended a batch early and silently:
//   1. a wedged worker whose respawn failed left the pool, and when the LAST
//      one left, the run resolved "finished" with the rest of the package never
//      started (the button re-enabled; only a second tap moved on);
//   2. any other throw rejected the whole Promise.all — the run ended with a
//      console line while the other workers kept looping on a released pool.
// `drainGameQueue` now reports where it stopped (the caller finishes the rest on
// the singleton) and skips a throwing game instead of ending the batch.
import { describe, it, expect, vi } from 'vitest';
import { __testables, WorkerWedgedError } from './gameAnalysisService';
import { buildGameRecord } from '../test/factories';
import type { GameRecord } from '../types';

const { drainGameQueue } = __testables;

interface FakeW { id: number; destroy: () => void }
const worked = { annotations: [{ moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 0, bestMove: null, bestMoveEval: 0, classification: 'good' as const, comment: null }], achievedDepth: 10, stats: { plies: 1, searched: 1, fromCache: 0, skippedBook: 0, refined: 0 } };

function games(n: number): GameRecord[] {
  return Array.from({ length: n }, (_, i) => buildGameRecord({ id: `g${i}` }));
}

function deps(over: Partial<Parameters<typeof drainGameQueue<FakeW>>[3]> = {}) {
  return {
    shouldStop: () => false,
    waitWhilePaused: async () => undefined,
    respawn: async (): Promise<FakeW> => { throw new Error('spawn timed out'); },
    analyze: async () => worked as never,
    onGameStart: vi.fn(),
    onGameDone: vi.fn(async () => undefined),
    onGameFailed: vi.fn(),
    onWorkerLost: vi.fn(),
    ...over,
  };
}

describe('drainGameQueue (#17)', () => {
  it('every worker lost → it says where it stopped, so the rest of the package still runs', async () => {
    const ws: FakeW[] = [{ id: 1, destroy: vi.fn() }, { id: 2, destroy: vi.fn() }];
    const live = new Set(ws);
    const d = deps({ analyze: async (g: GameRecord) => { throw new WorkerWedgedError(g.id); } });
    const r = await drainGameQueue(games(10), ws, live, d);
    expect(r.nextIdx).toBe(2); // each worker took one game, wedged, and could not respawn
    expect(r.completed).toBe(2);
    expect(live.size).toBe(0);
    expect(d.onWorkerLost).toHaveBeenCalledTimes(2);
    expect(d.onWorkerLost).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('a recycled worker keeps draining the queue', async () => {
    let n = 0;
    const ws: FakeW[] = [{ id: 1, destroy: vi.fn() }];
    const d = deps({
      analyze: async (g: GameRecord) => { if (n++ === 0) throw new WorkerWedgedError(g.id); return worked as never; },
      respawn: async () => ({ id: 9, destroy: vi.fn() }),
    });
    const r = await drainGameQueue(games(4), ws, new Set(ws), d);
    expect(r.nextIdx).toBe(4);
    expect(d.onGameDone).toHaveBeenCalledTimes(3);
  });

  it('a game that throws is skipped and named; the batch goes on', async () => {
    const ws: FakeW[] = [{ id: 1, destroy: vi.fn() }, { id: 2, destroy: vi.fn() }];
    const d = deps({
      analyze: async (g: GameRecord) => { if (g.id === 'g3') throw new Error('Dexie quota'); return worked as never; },
    });
    const r = await drainGameQueue(games(8), ws, new Set(ws), d);
    expect(r.nextIdx).toBe(8);
    expect(r.completed).toBe(8);
    expect(r.failed).toBe(1);
    expect(d.onGameDone).toHaveBeenCalledTimes(7);
    expect(d.onGameFailed).toHaveBeenCalledWith(expect.objectContaining({ id: 'g3' }), expect.any(Error));
  });

  it('a stop request ends the drain where it is', async () => {
    let stop = false;
    const ws: FakeW[] = [{ id: 1, destroy: vi.fn() }];
    const d = deps({ shouldStop: () => stop, onGameDone: vi.fn(async () => { stop = true; }) });
    const r = await drainGameQueue(games(5), ws, new Set(ws), d);
    expect(r.nextIdx).toBe(1);
  });
});
