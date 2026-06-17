import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '../db/schema';
import type { MasterPlayResult } from './masterPlayTypes';
import {
  readPersistedMasterPlay,
  writePersistedMasterPlay,
  __resetMasterPlayPersistenceForTests,
  __MASTER_PLAY_CACHE_VERSION,
} from './masterPlayPersistence';

const FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6';

function liveResult(overrides: Partial<MasterPlayResult> = {}): MasterPlayResult {
  return {
    fen: FEN,
    totalGames: 1200,
    moves: [
      { san: 'Nf3', games: 600, white: 300, draws: 200, black: 100, whitePct: 0.5, drawPct: 0.33, blackPct: 0.17 },
    ],
    source: 'lichess-live',
    topGames: [{ id: 'abc', white: 'Carlsen', black: 'Caruana', result: '1-0' }],
    ...overrides,
  };
}

describe('masterPlayPersistence', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    __resetMasterPlayPersistenceForTests();
  });

  it('persists a genuine live result and reads it back', async () => {
    const wrote = await writePersistedMasterPlay(FEN, liveResult());
    expect(wrote).toBe(true);
    const read = await readPersistedMasterPlay(FEN);
    expect(read).not.toBeNull();
    expect(read?.source).toBe('lichess-live');
    expect(read?.totalGames).toBe(1200);
    expect(read?.moves[0].san).toBe('Nf3');
  });

  it('returns null on a miss', async () => {
    expect(await readPersistedMasterPlay(FEN)).toBeNull();
  });

  it('normalizes the FEN key (6-field write, 4-field read hit)', async () => {
    await writePersistedMasterPlay(`${FEN} 0 3`, liveResult());
    const read = await readPersistedMasterPlay(FEN);
    expect(read).not.toBeNull();
  });

  it('does NOT persist a transient empty (source none)', async () => {
    const wrote = await writePersistedMasterPlay(FEN, {
      fen: FEN,
      totalGames: 0,
      moves: [],
      source: 'none',
    });
    expect(wrote).toBe(false);
    expect(await readPersistedMasterPlay(FEN)).toBeNull();
  });

  it('does NOT persist a bundled local-DB hit', async () => {
    const wrote = await writePersistedMasterPlay(FEN, liveResult({ source: 'local' }));
    expect(wrote).toBe(false);
    expect(await readPersistedMasterPlay(FEN)).toBeNull();
  });

  it('does NOT persist a live result with zero games', async () => {
    const wrote = await writePersistedMasterPlay(FEN, liveResult({ totalGames: 0, moves: [] }));
    expect(wrote).toBe(false);
    expect(await readPersistedMasterPlay(FEN)).toBeNull();
  });

  it('ignores rows with a mismatched record version (treated as miss)', async () => {
    await db.masterPlayCache.put({
      fen: FEN,
      result: liveResult(),
      cachedAt: Date.now(),
      v: __MASTER_PLAY_CACHE_VERSION + 999,
    });
    expect(await readPersistedMasterPlay(FEN)).toBeNull();
  });
});
