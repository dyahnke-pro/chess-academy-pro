import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { recordReviewedGame } from './autoAnalyzeGame';

// Review audit 2026-10-21: the puzzle sweep's engine reads now wait for the
// walk to go quiet, and the review page filed "you reviewed this game" only
// after the sweep — and only while the page was still open. The record lives
// in the service now (`recordReviewedGame`), beside `recordFinishedGame`.
const sweep = vi.hoisted(() => ({ fn: vi.fn<(id: string) => Promise<number>>() }));
vi.mock('./mistakePuzzleService', async (orig) => ({
  ...(await orig<typeof import('./mistakePuzzleService')>()),
  generateMistakePuzzlesFromGame: (id: string) => sweep.fn(id),
}));

const game = () => buildGameRecord({
  id: 'g-reviewed', source: 'coach', white: 'David', black: 'Stockfish Bot',
  pgn: '1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Be7',
  annotations: [
    { moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: 'e2e4', bestMoveEval: 20, classification: 'good', comment: null },
    { moveNumber: 3, color: 'white', san: 'Qxe5+', evaluation: -700, bestMove: 'g1f3', bestMoveEval: 25, classification: 'blunder', comment: null },
  ],
});
const rows = () => db.misconceptionTags.where('sourceGameId').equals('g-reviewed').toArray();

describe('recordReviewedGame — the review on the record, whatever the screen does', () => {
  beforeEach(async () => {
    await db.misconceptionTags.clear();
    await db.games.clear();
    await db.mistakePuzzles.clear();
    sweep.fn.mockReset();
  });

  it('runs the sweep first, then files the reviewed record (rows COUNT)', async () => {
    await db.games.put(game());
    let finishSweep!: (n: number) => void;
    sweep.fn.mockReturnValue(new Promise<number>((r) => { finishSweep = r; }));
    const done = recordReviewedGame(game(), 1200);
    await new Promise((r) => { setTimeout(r, 20); });
    expect(await rows(), 'the record ran ahead of the sweep it dedupes against').toHaveLength(0);
    finishSweep(2);
    expect(await done).toBe(2);
    const filed = await rows();
    expect(filed.length).toBeGreaterThan(0);
    expect(filed.every((r) => r.counted !== false)).toBe(true);
  });

  it('a sweep that fails still leaves the review on the record', async () => {
    await db.games.put(game());
    sweep.fn.mockRejectedValue(new Error('engine gone'));
    expect(await recordReviewedGame(game(), 1200)).toBe(0);
    expect((await rows()).length).toBeGreaterThan(0);
  });
});
