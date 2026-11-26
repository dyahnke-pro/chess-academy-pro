// 🔒 THE LAUNCH NEVER HOLDS THE LIBRARY (2026-11-26). An App Store user's web
// view was killed 0–3 s after launch, every launch, even with the /weaknesses
// report held: a boot onto the home screen measured +170 MB of JS heap with
// 1,000 games against +59 MB with 20 (scripts/audit-weaknesses-memory.mjs,
// AUDIT_DIRECT=1). Two launch readers loaded every game in full — the rating
// estimate (`calibrateStrength`, every boot) to use the NEWEST rated game, and
// the thinking transfer (Up next) to read a date off the analysed games. This
// fails on the old code: both called `toArray` on the whole table.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import { getPlayerRatingEstimate } from './playerRatingService';
import { loadThinkingTransfer } from './thinkingLessonStart';

const GAMES = 150;

describe('the launch readers read a page of games, never the library', () => {
  beforeEach(async () => {
    await db.games.clear();
    await db.misconceptionTags.clear();
    useAppStore.setState({ activeProfile: buildUserProfile({ preferences: { chessComUsername: 'me' } }) });
    await db.games.bulkAdd(Array.from({ length: GAMES }, (_, i) => buildGameRecord({
      id: `boot-${i}`, source: 'chesscom', white: 'me', black: `opp${i}`, whiteElo: 1000 + i, blackElo: 1500,
      date: `2025-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
      isMasterGame: false,
    })));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('the rating estimate reads the newest rated game, not every imported game', async () => {
    // Any collection read of whole rows off the games table (the old
    // `where('source').anyOf(…).toArray()`).
    const proto = Object.getPrototypeOf(db.games.toCollection()) as { toArray: () => unknown };
    const collToArray = vi.spyOn(proto, 'toArray');
    const bulk = vi.spyOn(db.games, 'bulkGet');
    const est = await getPlayerRatingEstimate();
    // The newest game by date: 2025-12-28 is game i with i%12=11, i%28=27.
    const newest = Array.from({ length: GAMES }, (_, i) => i)
      .filter((i) => i % 12 === 11 && i % 28 === 27)[0];
    expect(est.source).toBe('imported-games');
    expect(est.rating).toBe(1000 + newest);
    // Keys only off the indexes; rows a page at a time.
    const gamesReads = collToArray.mock.contexts.filter((c) => (c as { _ctx?: { table?: { name?: string } } })._ctx?.table?.name === 'games');
    expect(gamesReads).toHaveLength(0);
    const rowsRead = bulk.mock.calls.reduce((n, c) => n + (c[0] as unknown[]).length, 0);
    expect(rowsRead).toBeLessThanOrEqual(20);
  });

  it('the thinking transfer reads only the games a slip came from', async () => {
    const toArray = vi.spyOn(db.games, 'toArray');
    const bulk = vi.spyOn(db.games, 'bulkGet');
    await db.misconceptionTags.add({
      id: 't1', tag: 'hung-piece', source: 'auto-analysis', createdAt: Date.now(), fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      playedSan: 'a3', bestSan: 'a4', cpLoss: 200, gamePhase: 'middlegame', moveNumber: 10,
      sourceGameId: 'boot-3', status: 'open', masteryHits: 0, dueAt: Date.now(), counted: true,
    } as never);
    await loadThinkingTransfer();
    expect(toArray).not.toHaveBeenCalled();
    const rowsRead = bulk.mock.calls.reduce((n, c) => n + (c[0] as unknown[]).length, 0);
    expect(rowsRead).toBe(1);
  });
});
