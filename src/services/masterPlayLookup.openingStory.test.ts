// Learn's opening reads are synchronous, so "unknown" must never read as
// "out of book" (2026-10-19), and the first plies must be looked up ahead.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import {
  lookupMasterPlay, inBookCachedSync, masterMovesCachedSync, prefetchMastersTree,
  __resetMasterPlayLookupForTests, __setLocalDbForTests,
} from './masterPlayLookup';
import { _resetLichessCircuitBreaker } from './lichessExplorerService';
import { __resetMasterPlayPersistenceForTests } from './masterPlayPersistence';
import type { MasterPlayResult } from './masterPlayTypes';
import { db } from '../db/schema';

const START = new Chess().fen();
const deep = (): string => { const c = new Chess(); 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7'.split(' ').forEach((m) => c.move(m)); return c.fen(); };

beforeEach(async () => {
  __resetMasterPlayLookupForTests();
  __resetMasterPlayPersistenceForTests();
  _resetLichessCircuitBreaker();
  await db.masterPlayCache.clear();
});
afterEach(() => { __resetMasterPlayLookupForTests(); vi.restoreAllMocks(); });

describe('in book, from memory', () => {
  it('a miss in the (sparse) local file is unknown, not out of book', () => {
    // The local file holds only the start position — a deep Najdorf position
    // is past its end, which says nothing about theory.
    __setLocalDbForTests({ positions: { [START.split(' ').slice(0, 4).join(' ')]: [{ san: 'e4', games: 1000 }] } });
    expect(inBookCachedSync(START, 5)).toBe(true);
    expect(inBookCachedSync(deep(), 5)).toBeNull();
  });

  it('a LIVE answer of zero games is out of book', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ white: 0, draws: 0, black: 0, moves: [], topGames: [] }), { status: 200 }));
    const fen = deep();
    expect(masterMovesCachedSync(fen)).toBeNull();
    await lookupMasterPlay(fen, { triggeredBy: 'manual', skipLocalDb: true });
    expect(masterMovesCachedSync(fen)).toEqual([]);
    expect(inBookCachedSync(fen, 5)).toBe(false);
  });
});

describe('prefetchMastersTree', () => {
  it('walks the branches above the share bar, level by level, within the bound', async () => {
    const seen: string[] = [];
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      seen.push(fen);
      const c = new Chess(fen);
      const moves = c.history().length === 0 && fen === START
        ? [{ san: 'e4', games: 600 }, { san: 'd4', games: 350 }, { san: 'a3', games: 50 }]
        : [{ san: c.moves()[0], games: 100 }];
      return { fen, totalGames: moves.reduce((n, m) => n + m.games, 0), source: 'lichess-live', moves: moves.map((m) => ({ ...m, white: 0, draws: 0, black: 0, whitePct: 0, drawPct: 0, blackPct: 0 })) };
    };
    const n = await prefetchMastersTree(START, { surface: 'test', plies: 2, branchShare: 0.1, minNodeGames: 1, minWeight: 0, maxPositions: 10, lookup });
    // root + e4 + d4 (a3 is under 10%) + one child each.
    expect(n).toBe(5);
    expect(seen.some((f) => f.includes('P7/1PPPPPPP'))).toBe(false);
    const capped = await prefetchMastersTree(START, { surface: 'test', plies: 2, branchShare: 0.1, minNodeGames: 1, minWeight: 0, maxPositions: 2, lookup });
    expect(capped).toBe(2);
  });

  // A burst trips Lichess's rate limit, and the cooldown shuts every Lichess
  // call off — the opponent's book move included (Learn 2026-10-19).
  const fanOut = (fen: string): MasterPlayResult => {
    const moves = new Chess(fen).moves().slice(0, 4).map((san) => ({ san, games: 100, white: 0, draws: 0, black: 0, whitePct: 0, drawPct: 0, blackPct: 0 }));
    return { fen, totalGames: 400, source: 'lichess-live', moves };
  };
  it('looks positions up one at a time, never in a burst', async () => {
    let inFlight = 0; let most = 0;
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      inFlight += 1; most = Math.max(most, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return fanOut(fen);
    };
    const n = await prefetchMastersTree(START, { surface: 'test', plies: 2, branchShare: 0.1, minNodeGames: 1, minWeight: 0, maxPositions: 20, lookup, coolingDown: () => false });
    expect(n).toBe(20);
    expect(most).toBe(1);
  });
  it('stops while Lichess cools down', async () => {
    let calls = 0;
    const lookup = async (fen: string): Promise<MasterPlayResult> => { calls += 1; return fanOut(fen); };
    const n = await prefetchMastersTree(START, { surface: 'test', plies: 2, branchShare: 0.1, minNodeGames: 1, minWeight: 0, maxPositions: 20, lookup, coolingDown: () => calls >= 3 });
    expect(n).toBe(3);
    expect(calls).toBe(3);
  });
});
