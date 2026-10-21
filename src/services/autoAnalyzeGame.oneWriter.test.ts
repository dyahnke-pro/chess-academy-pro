import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { buildGameRecord } from '../test/factories';

// #130 (David's record, 2026-10-20): one game's slips were filed 24 times in
// four seconds — passes over the same game ran side by side, each read
// "nothing filed yet", and each wrote every slip. The writer is one per game.
const ID = 'g-race';
const game = () => buildGameRecord({
  id: ID, source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: '1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Be7',
  annotations: [
    { moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: 'e2e4', bestMoveEval: 20, classification: 'good', comment: null },
    { moveNumber: 2, color: 'white', san: 'Qh5', evaluation: -30, bestMove: 'g1f3', bestMoveEval: 35, classification: 'inaccuracy', comment: null },
    { moveNumber: 3, color: 'white', san: 'Qxe5+', evaluation: -700, bestMove: 'g1f3', bestMoveEval: 25, classification: 'blunder', comment: null },
  ],
});
const slips = () => db.misconceptionTags.where('sourceGameId').equals(ID).toArray();
const keyOf = (x: { fen: string; playedSan?: string | null; tag: string }): string => `${x.fen}|${x.playedSan ?? ''}|${x.tag}`;

describe('one writer per game (#130)', () => {
  beforeEach(async () => {
    await db.misconceptionTags.clear();
    await db.games.clear();
    await db.mistakePuzzles.clear();
    await db.capabilityEvidence.clear();
    await db.games.put(game());
  });

  it('five first passes at once file each slip once, and each puzzle once', async () => {
    await Promise.all(Array.from({ length: 5 }, () => autoAnalyzeGameMisconceptions(ID)));
    const rows = await slips();
    expect(rows.length).toBeGreaterThan(1);
    expect(new Set(rows.map(keyOf)).size).toBe(rows.length);
    const puzzles = await db.mistakePuzzles.where('sourceGameId').equals(ID).toArray();
    expect(new Set(puzzles.map((p) => `${p.fen}|${p.playerMoveSan}`)).size).toBe(puzzles.length);
  });

  it('five later passes at once file a slip the record was missing once', async () => {
    await autoAnalyzeGameMisconceptions(ID);
    const small = (await slips()).filter((x) => x.grade === 'inaccuracy');
    expect(small.length).toBeGreaterThan(0);
    await db.misconceptionTags.bulkDelete(small.map((x) => x.id));
    await Promise.all(Array.from({ length: 5 }, () => autoAnalyzeGameMisconceptions(ID)));
    expect((await slips()).filter((x) => x.grade === 'inaccuracy')).toHaveLength(small.length);
  });
});
