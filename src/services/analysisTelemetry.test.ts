import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  isBookLine: () => false,
}));

const audits: { kind: string; summary: string }[] = [];
vi.mock('./appAuditor', () => ({
  logAppAudit: (e: { kind: string; summary: string }) => { audits.push(e); return Promise.resolve(); },
}));

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    initialize: vi.fn(() => Promise.resolve()),
    analyzePosition: vi.fn(() => Promise.resolve({ evaluation: 0, bestMove: 'd2d4', depth: 10 })),
    analyzeWithBudget: vi.fn(() => Promise.resolve({ evaluation: 0, bestMove: 'd2d4', depth: 10 })),
  },
  isIosSafari: () => false,
  resolveWorkerUrl: () => ({ url: '/stockfish/stockfish-asm.js', variant: 'asm', reason: 'test', workerType: 'classic' }),
}));

import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { analyzeGameOnWorker } from './gameAnalysisService';
import { buildGameRecord } from '../test/factories';

// 🔒 A SPEED FIX YOU CANNOT MEASURE CANNOT BE VERIFIED (David 2026-09-05,
// "add the audit tools").
//
// The sweep audited nothing per game. After a real run on David's phone the
// only way to estimate throughput was to count `misconception-captured` side
// effects and read the gaps between them — which UNDERCOUNTS, because a game
// with no misconception finishes completely invisibly. That inference said
// ~10 games; he had actually analysed 13, and had stopped the run himself.
// Neither the true rate nor the stop was recoverable from the record.
//
// These pin the numbers that make the next run measurable instead of guessed:
// how long a game took, how much of it the eval cache absorbed, and the depth
// it actually reached.

const PGN = '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 1-0';
const FENS: string[] = (() => {
  const c = new Chess();
  c.loadPgn(PGN);
  const v = c.history({ verbose: true });
  return [v[0].before, ...v.map((m) => m.after)];
})();
const GAME = buildGameRecord({ pgn: PGN });
const CURVE = [20, 20, 20, 20, 20, -300, -300, -300, -300];

function worker() {
  return {
    analyzePosition: vi.fn((fen: string, depth: number) =>
      Promise.resolve({ evaluation: CURVE[FENS.indexOf(fen)] ?? 0, bestMove: 'd2d4', depth })),
    destroy: vi.fn(),
  } as never;
}

beforeEach(async () => {
  audits.length = 0;
  await db.delete();
  await db.open();
});

describe('a game reports what it actually cost', () => {
  it('counts every position, and how many the engine really had to search', async () => {
    const r = await analyzeGameOnWorker(GAME, worker());
    expect(r).not.toBeNull();
    const st = r!.stats;

    expect(st.plies).toBe(FENS.length);
    // Nothing cached on a cold device: every non-book position is searched.
    expect(st.fromCache).toBe(0);
    expect(st.searched).toBe(FENS.length - st.skippedBook);
    // The blunder at move 4 is the one slip that earns a deep best-move search.
    expect(st.refined).toBe(1);
  });

  it('shows the eval cache absorbing the work on a re-sweep — the number that justifies it', async () => {
    await analyzeGameOnWorker(GAME, worker());
    const again = await analyzeGameOnWorker(GAME, worker());
    const st = again!.stats;

    expect(st.fromCache).toBe(FENS.length);
    expect(st.searched, 'a fully cached game must cost the engine nothing').toBe(0);
  });

  it('the stats add up — no position is double-counted or lost', async () => {
    const r = await analyzeGameOnWorker(GAME, worker());
    const st = r!.stats;
    expect(st.searched + st.fromCache + st.skippedBook).toBe(st.plies);
  });
});
