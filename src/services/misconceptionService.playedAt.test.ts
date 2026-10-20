// A SLIP IS DATED BY ITS GAME (the lead, 2026-10-20): David's drop held 5,458
// slips and not one carried `playedAt`, so the hold rate ordered last week's
// game by the day it was reviewed. The one writer dates it from the stored game.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';

const FEN = 'r1bqk1nr/pp2ppbp/2np2p1/1Bp5/3PPP2/1P6/PBP3PP/RN1QK1NR b KQkq - 0 6';

describe('logMisconception — a slip from a stored game is dated by the game', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });
  it('a review slip of a game played 2025.03.04 carries that day (plus its ply), not today', async () => {
    await db.games.put({ id: 'g-old', date: '2025.03.04', pgn: '', white: 'a', black: 'b', result: '1-0' } as never);
    const r = await logMisconception({ tag: 'tempo-handed', source: 'game-review', fen: FEN, sourceGameId: 'g-old' });
    expect(r?.playedAt).toBe(Date.parse('2025-03-04') + 11);
  });
  it('a live game not yet stored keeps its capture time (no playedAt)', async () => {
    const r = await logMisconception({ tag: 'tempo-handed', source: 'discussion-practice', fen: FEN, sourceGameId: 'live-1' });
    expect(r?.playedAt).toBeUndefined();
  });
  it('a caller that knows the date wins', async () => {
    await db.games.put({ id: 'g-old', date: '2025.03.04', pgn: '', white: 'a', black: 'b', result: '1-0' } as never);
    const r = await logMisconception({ tag: 'tempo-handed', source: 'auto-analysis', fen: FEN, sourceGameId: 'g-old', playedAt: 42 });
    expect(r?.playedAt).toBe(42);
  });
});
