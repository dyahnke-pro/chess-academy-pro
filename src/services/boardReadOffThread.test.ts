/**
 * The board read off the main thread (`boardReadOffThread`): the worker's
 * answer is the direct call's, the engine asks travel back to the main
 * thread, and a missing worker falls back LOGGED.
 *
 * The worker here is a real second thread (`worker_threads` running the same
 * core the browser's worker runs), with structured clone between the threads.
 * A think pause's answer tag is the one difference (a per-thread counter's
 * character, no word); the read's surface strips it before the voice.
 * `BOARD_READ_WORKER=1` runs the 50-board identity check and the main-thread
 * time before / after.
 */
import { describe, it, expect } from 'vitest';
import { Worker as NodeWorker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { boardReadFacts } from './boardReadFacts';
import { createBoardReadClient, type WorkerLike, type FallbackReason } from './boardReadOffThread';
import type { FromWorker, ToWorker } from './boardReadWorkerCore';
import { BENCH_BOARDS, benchInput } from '../test/boardReadBench';
import { withoutTags } from '../utils/thinkPause';
import { Chess } from 'chess.js';
import { masterPlayCache } from './masterPlayCache';
import { masterMovesCachedSync, addConfirmedEmpty } from './masterPlayLookup';
import { createMirrorSender } from './boardReadData';

/** A read as a test compares it: a think pause's answer tag is a per-thread
 *  counter's character (`thinkPause.askThenAnswer`), never a word, so it is
 *  taken out (`withoutTags`, "what a test or a log compares"). */
const same = (x: unknown): string => withoutTags(JSON.stringify(x));

function nodeWorker(): WorkerLike {
  // tsx registered inside the thread first, so the worker's TypeScript loads.
  const target = pathToFileURL(path.resolve('src/test/boardReadNodeWorker.ts')).href;
  const w = new NodeWorker(`import('tsx/esm/api').then((m) => { m.register(); return import(${JSON.stringify(target)}); })`, { eval: true });
  const like: WorkerLike = {
    postMessage: (m: ToWorker) => w.postMessage(m),
    onmessage: null,
    onerror: null,
    terminate: () => { void w.terminate(); },
  };
  w.on('message', (data: FromWorker) => like.onmessage?.({ data }));
  w.on('error', (e) => like.onerror?.(e));
  return like;
}

/** The fast boards of the bench (a couple of seconds a read here). */
const FAST = [0, 8, 11];

describe('boardReadOffThread', () => {
  it('runs on the main thread, logged once, where there is no worker', async () => {
    const logs: FallbackReason[] = [];
    const client = createBoardReadClient(() => null, (r) => logs.push(r));
    const r = BENCH_BOARDS[0];
    const [a, b] = await Promise.all([client.read(benchInput(r)), client.read(benchInput(r))]);
    const direct = await boardReadFacts(benchInput(r));
    expect(a).toEqual(direct);
    expect(b).toEqual(direct);
    expect(logs).toEqual(['no-worker']);
  }, 120_000);

  it('a worker that fails hands its reads back to the main thread, logged', async () => {
    const logs: FallbackReason[] = [];
    let made: WorkerLike | null = null;
    const client = createBoardReadClient(() => {
      made = { postMessage: () => { setTimeout(() => made?.onerror?.(new Error('boom')), 0); }, onmessage: null, onerror: null, terminate: () => {} };
      return made;
    }, (r) => logs.push(r));
    const r = BENCH_BOARDS[0];
    const out = await client.read(benchInput(r));
    expect(out).toEqual(await boardReadFacts(benchInput(r)));
    expect(logs).toEqual(['worker-failed']);
  }, 120_000);

  it('the worker answers what the direct call answers, its engine reads asked of the main thread', async () => {
    const logs: FallbackReason[] = [];
    const client = createBoardReadClient(nodeWorker, (r) => logs.push(r));
    for (const k of FAST) {
      const r = BENCH_BOARDS[k];
      const asked = { reads: 0 };
      const [off, direct] = await Promise.all([client.read(benchInput(r, asked)), boardReadFacts(benchInput(r))]);
      expect(off.facts.length).toBeGreaterThan(0);
      expect(same(off)).toBe(same(direct));
      expect(asked.reads).toBeGreaterThan(0);
    }
    expect(logs).toEqual([]);
  }, 300_000);
});

describe('boardReadOffThread mirrors the page\'s data', () => {
  it('the masters\' answers the page holds reach the worker, each sent once', async () => {
    const sans = 'e4 e5 Nf3 Nc6 Bc4'.split(' ');
    const b = new Chess();
    const book: Array<[string, string]> = [];
    for (const s of sans) { book.push([b.fen(), s]); b.move(s); }
    for (const [f, san] of book) {
      masterPlayCache.set(f, { fen: f, totalGames: 500, source: 'lichess-live', moves: [{ san, games: 500, white: 200, draws: 150, black: 150, whitePct: 0.4, drawPct: 0.3, blackPct: 0.3 }] });
    }
    addConfirmedEmpty(['8/8/8/8/8/8/8/8 w - -']);
    try {
      const send = createMirrorSender();
      const first = send();
      expect(first.masters.length).toBe(book.length);
      expect(first.emptyPositions).toEqual(['8/8/8/8/8/8/8/8 w - -']);
      // Nothing new on the page: nothing sent again.
      const second = send();
      expect(second.masters).toEqual([]);
      expect(second.emptyPositions).toEqual([]);
      const target = pathToFileURL(path.resolve('src/test/boardReadMirrorProbe.ts')).href;
      const w = new NodeWorker(`import('tsx/esm/api').then((m) => { m.register(); return import(${JSON.stringify(target)}); })`, { eval: true });
      try {
        const ask = [...book.map(([f]) => f), b.fen()];
        const got = await new Promise<unknown>((resolve, reject) => {
          w.once('message', resolve);
          w.once('error', reject);
          w.postMessage({ mirror: first, ask });
        });
        // The page's answers, read in the other thread; the unanswered board stays unknown.
        expect(got).toEqual(ask.map((f) => masterMovesCachedSync(f)));
        expect((got as unknown[]).slice(0, book.length).every((x) => Array.isArray(x) && x.length === 1)).toBe(true);
        expect((got as unknown[])[book.length]).toBeNull();
      } finally {
        await w.terminate();
      }
    } finally {
      masterPlayCache.clear();
    }
  }, 120_000);
});

describe.skipIf(process.env.BOARD_READ_WORKER !== '1')('boardReadOffThread on 50 boards', () => {
  it('identical facts, and the main thread nearly idle while the worker reads', async () => {
    const client = createBoardReadClient(nodeWorker, () => { throw new Error('fell back'); });
    const boards = BENCH_BOARDS.slice(0, 50);
    let directMs = 0;
    let offMs = 0;
    let offWall = 0;
    for (const [k, r] of boards.entries()) {
      // The worker's read first, alone: the main thread's busy time is what it costs here.
      const e0 = performance.eventLoopUtilization();
      const w0 = performance.now();
      const off = await client.read(benchInput(r));
      const e1 = performance.eventLoopUtilization(e0);
      offWall += performance.now() - w0;
      offMs += e1.active;
      const d0 = performance.eventLoopUtilization();
      const direct = await boardReadFacts(benchInput(r));
      directMs += performance.eventLoopUtilization(d0).active;
      expect(same(off), `board ${k} ${r.fen}`).toBe(same(direct));
    }
    console.log(`[board-read-worker] ${boards.length} boards: main thread ${Math.round(directMs / boards.length)} ms/read direct, ${Math.round(offMs / boards.length)} ms/read off-thread (worker wall ${Math.round(offWall / boards.length)} ms/read)`);
    expect(offMs).toBeLessThan(directMs / 10);
  }, 3_600_000);
});
