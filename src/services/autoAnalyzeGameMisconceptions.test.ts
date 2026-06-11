import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

// Integration: the BULK faucet that fills the Thinking-Errors bucket from a
// game's annotations (David 2026-06-11). Real deterministic classifier, real
// Dexie (fake-indexeddb) — no mocks. Proves importing/analyzing a game now
// populates misconceptionTags (it never did before — interactive-only).

// 1.e4 e5 2.Qh5 Nc6 3.Qxe5+?? hangs the queen to the c6 knight.
const PGN = '1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Be7';

function blunderAnnotations(): MoveAnnotation[] {
  return [
    { moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: 'e2e4', bestMoveEval: 20, classification: 'good', comment: null },
    { moveNumber: 3, color: 'white', san: 'Qxe5+', evaluation: -700, bestMove: 'g1f3', bestMoveEval: 25, classification: 'blunder', comment: null },
  ];
}

beforeEach(async () => {
  await db.misconceptionTags.clear();
  await db.games.clear();
});

describe('autoAnalyzeGameMisconceptions', () => {
  it('tags a hung queen from a coach game and writes it display-only (counted=false)', async () => {
    const game = buildGameRecord({
      id: 'g-hang-queen',
      source: 'coach',
      white: 'David',
      black: 'Stockfish Bot', // → player is white
      pgn: PGN,
      annotations: blunderAnnotations(),
    });
    await db.games.put(game);

    const result = await autoAnalyzeGameMisconceptions('g-hang-queen');
    expect(result.logged).toBeGreaterThan(0);

    const rows = await db.misconceptionTags.where('sourceGameId').equals('g-hang-queen').toArray();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.tag === 'hung-material')).toBe(true);
    // Display-only: shows in Thinking Errors but doesn't inflate the weakness profile.
    expect(rows.every((r) => r.counted === false)).toBe(true);
    expect(rows.every((r) => r.source === 'auto-analysis')).toBe(true);
  });

  it('is idempotent — re-running the same game logs nothing new', async () => {
    const game = buildGameRecord({
      id: 'g-idem',
      source: 'coach',
      white: 'David',
      black: 'Stockfish Bot',
      pgn: PGN,
      annotations: blunderAnnotations(),
    });
    await db.games.put(game);

    await autoAnalyzeGameMisconceptions('g-idem');
    const after1 = await db.misconceptionTags.where('sourceGameId').equals('g-idem').count();
    const second = await autoAnalyzeGameMisconceptions('g-idem');
    const after2 = await db.misconceptionTags.where('sourceGameId').equals('g-idem').count();

    expect(after1).toBeGreaterThan(0);
    expect(second).toEqual({ classified: 0, logged: 0 });
    expect(after2).toBe(after1);
  });

  it('no-ops on a game with no annotations', async () => {
    const game = buildGameRecord({
      id: 'g-bare',
      source: 'coach',
      white: 'David',
      black: 'Stockfish Bot',
      pgn: PGN,
      annotations: null,
    });
    await db.games.put(game);
    expect(await autoAnalyzeGameMisconceptions('g-bare')).toEqual({ classified: 0, logged: 0 });
  });
});
