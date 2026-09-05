import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { countGamesNeedingAnalysis, analyzeAllGames, analyzeRecentGames, gameNeedsAnalysis, ANALYSIS_DEPTH, ANALYSIS_PACKAGE_SIZE } from './gameAnalysisService';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import { useAppStore } from '../stores/appStore';
import type { StockfishAnalysis } from '../types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('./stockfishEngine', () => {
  const analyzePosition = vi.fn();
  return {
    stockfishEngine: {
      initialize: vi.fn(),
      analyzePosition,
      // The bulk sweep caps the singleton through analyzeWithBudget. Same engine,
      // same answer — delegate so every existing eval assertion still holds.
      analyzeWithBudget: vi.fn((fen: string, depth: number) => analyzePosition(fen, depth)),
    },
    // resolveWorkerPoolSize() calls isIosSafari() at module load; the pool build
    // resolver is called when a worker spawns. jsdom is not iOS and has no Worker,
    // so both are inert here (the tests take the sequential singleton fallback).
    isIosSafari: vi.fn(() => false),
    resolveWorkerUrl: vi.fn(() => ({ url: '/stockfish/stockfish-asm.js', variant: 'asm', reason: 'test' })),
  };
});

vi.mock('./weaknessAnalyzer', () => ({
  computeWeaknessProfile: vi.fn(),
}));

vi.mock('./mistakePuzzleService', () => ({
  generateMistakePuzzlesFromGame: vi.fn().mockResolvedValue(0),
}));

import { stockfishEngine } from './stockfishEngine';
import { computeWeaknessProfile } from './weaknessAnalyzer';
import { generateMistakePuzzlesFromGame } from './mistakePuzzleService';

const mockAnalyzePosition = vi.mocked(stockfishEngine).analyzePosition;
const mockInitialize = vi.mocked(stockfishEngine).initialize;
const mockComputeWeaknessProfile = vi.mocked(computeWeaknessProfile);
const mockGenMistakes = vi.mocked(generateMistakePuzzlesFromGame);

function mockAnalysis(evaluation: number, bestMove: string): StockfishAnalysis {
  return { evaluation, bestMove, isMate: false, mateIn: null, depth: 12, topLines: [], nodesPerSecond: 100000 };
}

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
      strengthItems: [],
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

    it('counts games with missing or partial annotations', async () => {
      // Game with full annotations (1 annotation per move) should NOT be counted.
      // Evals are centipawns; `bestMoveEval` present so gameNeedsAnalysis
      // doesn't flag the record as a pre-fix legacy shape.
      const fullPgn = '1. e4 e5 1/2-1/2';
      const fullAnnotations = [
        { moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 30, bestMove: null, bestMoveEval: 0, classification: 'good' as const, comment: null },
        { moveNumber: 1, color: 'black' as const, san: 'e5', evaluation: 20, bestMove: null, bestMoveEval: 30, classification: 'good' as const, comment: null },
      ];

      await db.games.bulkAdd([
        buildGameRecord({ id: 'g1', annotations: null }),
        buildGameRecord({ id: 'g2', annotations: [] }),
        // Fully analyzed AT THE CURRENT DEPTH → up to date, not counted.
        buildGameRecord({ id: 'g3', pgn: fullPgn, annotations: fullAnnotations, fullyAnalyzed: true, analysisDepth: ANALYSIS_DEPTH }),
      ]);

      const count = await countGamesNeedingAnalysis();
      expect(count).toBe(2);
    });

    it('does NOT batch-count depth-stale games — the deepening is lazy, on-open only (David 2026-06-27)', async () => {
      const fullPgn = '1. e4 e5 1/2-1/2';
      const fullAnnotations = [
        { moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 30, bestMove: null, bestMoveEval: 0, classification: 'good' as const, comment: null },
        { moveNumber: 1, color: 'black' as const, san: 'e5', evaluation: 20, bestMove: null, bestMoveEval: 30, classification: 'good' as const, comment: null },
      ];
      const shallow = buildGameRecord({ id: 'shallow', pgn: fullPgn, annotations: fullAnnotations, fullyAnalyzed: true, analysisDepth: 12 });
      await db.games.bulkAdd([shallow]);

      // The background batch sweep MUST NOT re-crunch all 690 depth-12
      // games — depthUpgrade is suppressed there, so the count is 0.
      expect(await countGamesNeedingAnalysis()).toBe(0);

      // But the on-open path (default depthUpgrade) DOES flag it so opening
      // the game for review refreshes it to the deeper depth.
      expect(gameNeedsAnalysis(shallow)).toBe(true);
      expect(gameNeedsAnalysis(shallow, { depthUpgrade: false })).toBe(false);
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
        .mockResolvedValueOnce(mockAnalysis(30, 'e2e4'))   // start
        .mockResolvedValueOnce(mockAnalysis(25, 'e7e5'))   // after e4
        .mockResolvedValueOnce(mockAnalysis(30, 'g1f3'))   // after e5
        .mockResolvedValueOnce(mockAnalysis(20, 'b8c6'))   // after Nf3
        .mockResolvedValueOnce(mockAnalysis(25, 'd2d4'));  // after Nc6

      const result = await analyzeAllGames();
      expect(result).toBe(1);

      // Verify annotations were written back
      const updated = await db.games.get('analyze-me');
      expect(updated?.annotations).not.toBeNull();
      expect(updated?.annotations?.length).toBe(4);
    });

    it('stamps the depth the search REACHED, so a shallow analysis can be re-deepened', async () => {
      // 🔒 THE FROZEN-SHALLOW REVIEW. `analyzePosition` is bounded by a
      // per-variant `movetime` budget, so ANALYSIS_DEPTH is a ceiling the search
      // may never reach. The record was stamped with the ceiling regardless.
      //
      // Measured on David's iPhone 2026-08-11 (PostHog, his own review URL): iOS
      // routes to the asm.js build by design, which gets a 5s budget per
      // position; his 66-position review took 216s — ~3.3s a position, running
      // to the clock rather than to depth 16. It was then filed as depth 16, so
      // `gameNeedsAnalysis` read it as current and it could never be re-deepened
      // — on any device, ever. Accuracy is computed off these evals, which is
      // the exact metric the depth bump existed to fix.
      const game = buildGameRecord({
        id: 'truncated', pgn: '1. e4 e5 2. Nf3 Nc6 1/2-1/2', annotations: null, isMasterGame: false,
      });
      await db.games.add(game);
      // The mock reports depth 12 — a search that ran out of time short of 16.
      mockAnalyzePosition.mockResolvedValue(mockAnalysis(25, 'e2e4'));

      await analyzeAllGames();

      const updated = await db.games.get('truncated');
      expect(updated?.analysisDepth, 'stamped the depth we ASKED for, not the one we got')
        .toBe(12);
      expect(updated?.analysisDepth).toBeLessThan(ANALYSIS_DEPTH);
      // The whole point: it must read as stale so a faster engine redoes it.
      expect(gameNeedsAnalysis({ ...game, ...updated! }), 'a truncated analysis was filed as final')
        .toBe(true);
    });

    it('a full-depth search is filed as final and not re-analyzed', async () => {
      // The other half — the fix must not condemn every game to re-analysis.
      const game = buildGameRecord({
        id: 'full-depth', pgn: '1. e4 e5 2. Nf3 Nc6 1/2-1/2', annotations: null, isMasterGame: false,
      });
      await db.games.add(game);
      mockAnalyzePosition.mockResolvedValue({
        ...mockAnalysis(25, 'e2e4'), depth: ANALYSIS_DEPTH,
      });

      await analyzeAllGames();

      const updated = await db.games.get('full-depth');
      expect(updated?.analysisDepth).toBe(ANALYSIS_DEPTH);
      expect(gameNeedsAnalysis({ ...game, ...updated! })).toBe(false);
    });

    it('generates mistake puzzles INLINE per analyzed game, not batched at the end', async () => {
      // The fix (David 2026-06-06): mistakes must be generated as each game
      // finishes, so an interrupted run still produces puzzles for the games it
      // did analyze. Two games → generateMistakePuzzlesFromGame fires for each.
      for (const id of ['game-a', 'game-b']) {
        await db.games.add(buildGameRecord({
          id, pgn: '1. e4 e5 2. Nf3 Nc6 1/2-1/2', annotations: null, isMasterGame: false,
        }));
      }
      mockAnalyzePosition.mockResolvedValue(mockAnalysis(25, 'e2e4'));

      await analyzeAllGames();

      const calledIds = mockGenMistakes.mock.calls.map((c) => c[0]);
      expect(calledIds).toContain('game-a');
      expect(calledIds).toContain('game-b');
      expect(mockGenMistakes).toHaveBeenCalledTimes(2);
    });

    it('reports progress during analysis', async () => {
      const game = buildGameRecord({
        id: 'progress-test',
        pgn: '1. e4 e5 1/2-1/2',
        annotations: null,
        isMasterGame: false,
      });
      await db.games.add(game);

      mockAnalyzePosition.mockResolvedValue(mockAnalysis(30, 'e2e4'));

      const progressUpdates: Array<{ phase: string }> = [];
      await analyzeAllGames((progress) => {
        progressUpdates.push({ phase: progress.phase });
      });

      const phases = progressUpdates.map((p) => p.phase);
      expect(phases).toContain('analyzing');
      expect(phases).toContain('computing_weaknesses');
      expect(phases).toContain('done');
    });

    it('skips games that already have full annotations', async () => {
      // Centipawn evals + `bestMoveEval` present + fullyAnalyzed flag —
      // matches the post-ship-1 annotation shape so gameNeedsAnalysis
      // short-circuits.
      await db.games.add(buildGameRecord({
        id: 'already-done',
        pgn: '1. e4 e5 1/2-1/2',
        annotations: [
          { moveNumber: 1, color: 'white', san: 'e4', evaluation: 30, bestMove: null, bestMoveEval: 0, classification: 'good', comment: null },
          { moveNumber: 1, color: 'black', san: 'e5', evaluation: 20, bestMove: null, bestMoveEval: 30, classification: 'good', comment: null },
        ],
        fullyAnalyzed: true,
        analysisDepth: ANALYSIS_DEPTH,
        isMasterGame: false,
      }));

      const result = await analyzeAllGames();
      expect(result).toBe(0);
      expect(mockAnalyzePosition).not.toHaveBeenCalled();
    });

    it('analyzes at most one package (ANALYSIS_PACKAGE_SIZE) then stops, newest-first', async () => {
      // David 2026-09-05: a full library never finished in one run. A batch
      // caps at ANALYSIS_PACKAGE_SIZE newest games and stops; the rest are left
      // for the next tap. Seed one-more-than-a-package so the boundary is real.
      const total = ANALYSIS_PACKAGE_SIZE + 5;
      for (let i = 0; i < total; i++) {
        // Zero-padded month/day so lexical date order == chronological; i=0 is
        // the OLDEST, so ids g-000..g-004 are the 5 that must be left behind.
        const yyyy = 2024 + Math.floor(i / 300);
        const day = String((i % 28) + 1).padStart(2, '0');
        const mon = String((i % 12) + 1).padStart(2, '0');
        await db.games.add(buildGameRecord({
          id: `g-${String(i).padStart(3, '0')}`,
          date: `${yyyy}-${mon}-${day}T00:00:${String(i % 60).padStart(2, '0')}Z`,
          pgn: '1. e4 e5 1/2-1/2',
          annotations: null,
          isMasterGame: false,
        }));
      }
      mockAnalyzePosition.mockResolvedValue(mockAnalysis(25, 'e2e4'));

      const analyzed = await analyzeAllGames();
      expect(analyzed).toBe(ANALYSIS_PACKAGE_SIZE);

      // Exactly the remainder is still waiting for the next invocation.
      const stillNeeding = await countGamesNeedingAnalysis();
      expect(stillNeeding).toBe(total - ANALYSIS_PACKAGE_SIZE);
    });
  });

  describe('analyzeRecentGames', () => {
    it('returns 0 when no games need analysis', async () => {
      const result = await analyzeRecentGames(5);
      expect(result).toBe(0);
      expect(mockAnalyzePosition).not.toHaveBeenCalled();
    });

    it('analyzes only the N most-recent unanalyzed games', async () => {
      // Add 4 games dated oldest → newest. Only the 2 newest should
      // be analyzed when n=2.
      const games = [
        buildGameRecord({ id: 'g-old-1', date: '2024-01-01', pgn: '1. e4 e5 1/2-1/2', annotations: null, isMasterGame: false }),
        buildGameRecord({ id: 'g-old-2', date: '2024-02-01', pgn: '1. e4 e5 1/2-1/2', annotations: null, isMasterGame: false }),
        buildGameRecord({ id: 'g-new-1', date: '2025-12-01', pgn: '1. e4 e5 1/2-1/2', annotations: null, isMasterGame: false }),
        buildGameRecord({ id: 'g-new-2', date: '2026-04-01', pgn: '1. e4 e5 1/2-1/2', annotations: null, isMasterGame: false }),
      ];
      for (const g of games) await db.games.add(g);

      mockAnalyzePosition.mockResolvedValue(mockAnalysis(0, 'e2e4'));

      const result = await analyzeRecentGames(2);
      expect(result).toBe(2);

      const newest = await db.games.get('g-new-2');
      const second = await db.games.get('g-new-1');
      const older = await db.games.get('g-old-2');
      expect(newest?.fullyAnalyzed).toBe(true);
      expect(second?.fullyAnalyzed).toBe(true);
      expect(older?.fullyAnalyzed).toBeUndefined();
    });

    it('reports per-game progress', async () => {
      await db.games.add(buildGameRecord({
        id: 'r1', date: '2026-01-01', pgn: '1. e4 e5 1/2-1/2', annotations: null, isMasterGame: false,
      }));
      mockAnalyzePosition.mockResolvedValue(mockAnalysis(0, 'e2e4'));

      const updates: Array<{ current: number; total: number; label: string }> = [];
      await analyzeRecentGames(5, (p) => updates.push(p));

      expect(updates.length).toBeGreaterThanOrEqual(2);
      expect(updates[0].label).toMatch(/Analyzing game/);
      expect(updates[updates.length - 1].label).toMatch(/Ready/);
    });
  });
});
