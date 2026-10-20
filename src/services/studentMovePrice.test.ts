// THE PRICE OF THE STUDENT'S MOVE LEADS THE ENGINE (OS-18, Smith-Morra replay
// 2026-10-20, move 14: 14.Rd5 cost 185cp and its verdict was built 6.7 s after
// the move, the price having queued behind the turn's other searches).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { stockfishEngine } from './stockfishEngine';
import { clearMovePriceMemo, liveMovePrice, studentMovePrice } from './playedMoveGrade';
import type { StockfishAnalysis } from '../types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FAN = { topLines: [{ moves: ['e2e4'], evaluation: 30, mate: null }], depth: 8 };
const analysis = (topLines: StockfishAnalysis['topLines']): StockfishAnalysis =>
  ({ bestMove: topLines[0]?.moves[0] ?? '', evaluation: 0, isMate: false, mateIn: null, depth: 14, topLines, nodesPerSecond: 0 }) as StockfishAnalysis;

type Dispatch = (fen: string, depth: number, options?: Record<string, string | number>) => Promise<StockfishAnalysis>;

/** The engine busy the way a Learn turn leaves it: one brain search running
 *  and one more waiting behind it. Only a `searchmoves` read (the price)
 *  answers at once. */
async function withBusyEngine(run: (released: () => boolean) => Promise<void>): Promise<void> {
  const engineAny = stockfishEngine as unknown as { _dispatchAnalysis: Dispatch };
  let release!: () => void;
  const running = new Promise<void>((r) => { release = r; });
  let wasReleased = false;
  const spy = vi.spyOn(engineAny, '_dispatchAnalysis').mockImplementation(async (_fen, _depth, options) => {
    if (options && 'searchmoves' in options) {
      return analysis([
        { rank: 1, moves: ['e2e4'], evaluation: 50, mate: null, depth: 14 },
        { rank: 2, moves: ['a2a3'], evaluation: -150, mate: null, depth: 14 },
      ] as unknown as StockfishAnalysis['topLines']);
    }
    await running;
    return analysis([]);
  });
  const busy = stockfishEngine.analyzePosition('8/8/8/4k3/8/8/8/4K2R w - - 0 1', 14);
  const queued = stockfishEngine.analyzePosition('8/8/8/4k3/8/8/8/4KR2 w - - 0 1', 14);
  try {
    await new Promise((r) => setTimeout(r, 10));
    await run(() => wasReleased);
  } finally {
    wasReleased = true;
    release();
    await Promise.allSettled([busy, queued]);
    spy.mockRestore();
  }
}

describe('the student\'s move price leads the engine queue', () => {
  beforeEach(() => { clearMovePriceMemo(); });

  it('studentMovePrice answers while another search is running and one more waits', async () => {
    await withBusyEngine(async (released) => {
      const price = await Promise.race([
        studentMovePrice(START, 'a2a3', FAN, 14),
        new Promise<'waited'>((r) => setTimeout(() => r('waited'), 500)),
      ]);
      expect(price === 'waited' ? price : price?.costCp).toBe(200);
      expect(released()).toBe(false);
    });
  });

  it('it is the ONE price: the record reading the same move gets the same search', () => {
    const lead = studentMovePrice(START, 'a2a3', FAN, 14);
    expect(liveMovePrice(START, 'a2a3', FAN, 14)).toBe(lead);
  });

  it('the old door waits its turn in the line — the defect this replaces', async () => {
    await withBusyEngine(async () => {
      const cost = await Promise.race([
        liveMovePrice(START, 'a2a3', FAN, 14),
        new Promise<'waited'>((r) => setTimeout(() => r('waited'), 300)),
      ]);
      expect(cost).toBe('waited');
    });
  });

  it('Learn prices the student\'s move through the leading door', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/const priceRead[^\n]*\n\s*\? studentMovePrice\(fenBefore/);
  });
});
