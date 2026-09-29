import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile, buildGameRecord } from '../test/factories';
import { TACTIC_TYPE_REV } from './tacticTypeBackfill';

// 🔒 THE PATTERNS-TAB FREEZE (2026-09-29). The Patterns tab classified every
// brilliant/great move in the library, inline, three times over (breadth,
// transfer gap, recognition matrix) — 206 s on a 900-game library. It now reads
// each game's stored `foundTacticTypes` and never runs the classifier.
const detect = vi.fn(() => 'fork' as const);
vi.mock('./missedTacticService', async (orig) => {
  const actual = await orig<typeof import('./missedTacticService')>();
  return { ...actual, detectTacticType: (...a: unknown[]) => (detect as unknown as (...x: unknown[]) => string)(...a) };
});

const ANN = [
  { moveNumber: 1, san: 'e4', color: 'white', classification: 'brilliant', evaluation: 20, bestMove: null, bestMoveEval: 20, comment: null },
] as never;

describe('Patterns tab tactic analytics read stored finds', () => {
  beforeEach(async () => {
    detect.mockClear();
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', name: 'hero', preferences: { chessComUsername: 'hero' } }));
    await db.games.bulkPut([
      buildGameRecord({ id: 'g1', white: 'hero', black: 'foe', result: '1-0', pgn: '1. e4 e5 1-0', annotations: ANN, fullyAnalyzed: true, tacticsClassifiedRev: TACTIC_TYPE_REV, foundTacticTypes: ['fork', 'pin'] }),
      buildGameRecord({ id: 'g2', white: 'hero', black: 'foe', result: '1-0', pgn: '1. e4 e5 1-0', annotations: ANN, fullyAnalyzed: true, tacticsClassifiedRev: TACTIC_TYPE_REV, foundTacticTypes: ['fork'] }),
      buildGameRecord({ id: 'g3', white: 'hero', black: 'foe', result: '1-0', pgn: '1. e4 e5 1-0', annotations: ANN, fullyAnalyzed: true }),
    ]);
  });

  it('counts stored finds, never classifies, and reports unclassified games as pending', { timeout: 30000 }, async () => {
    const A = await import('./analyticsService');
    const summary = await A.engagementSummary();
    expect(detect).not.toHaveBeenCalled();
    expect(summary.breadth.types).toEqual(['fork', 'pin']);
    const fork = summary.transferGap.find((r) => r.tacticType === 'fork');
    expect(fork?.gameOccurrences).toBe(2);
    expect(summary.gamesPendingClassification).toBe(1);
    expect(summary.totalGames).toBe(3);
  });

  it('shares ONE games-table read across the analytics asked for at once', { timeout: 30000 }, async () => {
    const A = await import('./analyticsService');
    const spy = vi.spyOn(db.games, 'filter');
    await Promise.all([A.tacticTypeBreadth(), A.tacticTransferGap(), A.tacticRecognitionMatrix(), A.colorProficiencyMismatch()]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
