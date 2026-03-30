import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { countGamesNeedingAnalysis, analyzeAllGames } from './gameAnalysisService';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import { useAppStore } from '../stores/appStore';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    initialize: vi.fn(),
    analyzePosition: vi.fn(),
  },
}));

vi.mock('./weaknessAnalyzer', () => ({
  computeWeaknessProfile: vi.fn(),
}));

import { stockfishEngine } from './stockfishEngine';
import { computeWeaknessProfile } from './weaknessAnalyzer';

const mockAnalyzePosition = vi.mocked(stockfishEngine).analyzePosition;
const mockInitialize = vi.mocked(stockfishEngine).initialize;
const mockComputeWeaknessProfile = vi.mocked(computeWeaknessProfile);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('gameAnalysisService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
    mockInitialize.mockResolvedValue(undefined);
    mockComputeWeaknessProfile.mockResolvedValue({
      computedAt: new Date().toISOString(),
      items: [],
      strengths: [],
      overallAssessment: '',
    });

    const profile = buildUserProfile();
    useAppStore.getState().setActiveProfile(profile);
    await db.profiles.add(profile);
  });

  describe('countGamesNeedingAnalysis', () => {
    it('returns 0 when no games exist', async () => {
      const count = await countGamesNeedingAnalysis();
      expect(count).toBe(0);
    });

    it('counts games without annotations', async () => {
      await db.games.bulkAdd([
        buildGameRecord({ id: 'g1', annotations: null }),
        buildGameRecord({ id: 'g2', annotations: null }),
        buildGameRecord({ id: 'g3', annotations: [
          { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0.3, bestMove: null, classification: 'good', comment: null },
        ] }),
      ]);

      const count = await countGamesNeedingAnalysis();
      expect(count).toBe(2);
    });

    it('excludes master games', async () => {
      await db.games.bulkAdd([
        buildGameRecord({ id: 'g1', annotations: null, isMasterGame: true }),
        buildGameRecord({ id: 'g2', annotations: null, isMasterGame: false }),
      ]);

      const count = await countGamesNeedingAnalysis();
      expect(count).toBe(1);
    });
  });

  describe('analyzeAllGames', () => {
    it('returns 0 and recomputes weakness profile when no games need analysis', async () => {
      const result = await analyzeAllGames();
      expect(result).toBe(0);
      expect(mockComputeWeaknessProfile).toHaveBeenCalledTimes(1);
    });

    it('analyzes games without annotations and writes them back', async () => {
      const game = buildGameRecord({
        id: 'analyze-me',
        pgn: '1. e4 e5 2. Nf3 Nc6 1/2-1/2',
        annotations: null,
        isMasterGame: false,
      });
      await db.games.add(game);

      // Mock Stockfish to return evals for each position (5 positions for 4 half-moves + start)
      mockAnalyzePosition
        .mockResolvedValueOnce({ evaluation: 30, bestMove: 'e2e4', topLines: [] })  // start
        .mockResolvedValueOnce({ evaluation: 25, bestMove: 'e7e5', topLines: [] })  // after e4
        .mockResolvedValueOnce({ evaluation: 30, bestMove: 'g1f3', topLines: [] })  // after e5
        .mockResolvedValueOnce({ evaluation: 20, bestMove: 'b8c6', topLines: [] })  // after Nf3
        .mockResolvedValueOnce({ evaluation: 25, bestMove: 'd2d4', topLines: [] }); // after Nc6

      const result = await analyzeAllGames();
      expect(result).toBe(1);

      // Verify annotations were written back
      const updated = await db.games.get('analyze-me');
      expect(updated?.annotations).not.toBeNull();
      expect(updated?.annotations?.length).toBe(4);
    });

    it('reports progress during analysis', async () => {
      const game = buildGameRecord({
        id: 'progress-test',
        pgn: '1. e4 e5 1/2-1/2',
        annotations: null,
        isMasterGame: false,
      });
      await db.games.add(game);

      mockAnalyzePosition.mockResolvedValue({ evaluation: 30, bestMove: 'e2e4', topLines: [] });

      const progressUpdates: Array<{ phase: string }> = [];
      await analyzeAllGames((progress) => {
        progressUpdates.push({ phase: progress.phase });
      });

      const phases = progressUpdates.map((p) => p.phase);
      expect(phases).toContain('analyzing');
      expect(phases).toContain('computing_weaknesses');
      expect(phases).toContain('done');
    });

    it('skips games that already have annotations', async () => {
      await db.games.add(buildGameRecord({
        id: 'already-done',
        pgn: '1. e4 e5 1/2-1/2',
        annotations: [
          { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0.3, bestMove: null, classification: 'good', comment: null },
        ],
        isMasterGame: false,
      }));

      const result = await analyzeAllGames();
      expect(result).toBe(0);
      expect(mockAnalyzePosition).not.toHaveBeenCalled();
    });
  });
});
