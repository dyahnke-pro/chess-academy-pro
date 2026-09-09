import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import {
  buildGameRecord,
  buildMistakePuzzle,
  buildOpeningRecord,
  buildUserProfile,
  resetFactoryCounter,
} from '../test/factories';
import type { CoachGameMove, GameAccuracy, MoveClassificationCounts, PhaseAccuracy, MissedTactic } from '../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockReconstructMovesFromGame = vi.fn<() => CoachGameMove[]>();
const mockCalculateAccuracy = vi.fn<() => GameAccuracy>();
const mockGetClassificationCounts = vi.fn<() => MoveClassificationCounts>();
const mockGetPhaseBreakdown = vi.fn<() => PhaseAccuracy[]>();
const mockDetectMissedTactics = vi.fn<() => MissedTactic[]>();
const mockGetMistakePuzzleStats = vi.fn();

vi.mock('./gameReconstructionService', () => ({
  reconstructMovesFromGame: (...args: unknown[]): unknown => mockReconstructMovesFromGame(...args as []),
}));

vi.mock('./accuracyService', () => ({
  calculateAccuracy: (...args: unknown[]): unknown => mockCalculateAccuracy(...args as []),
  getClassificationCounts: (...args: unknown[]): unknown => mockGetClassificationCounts(...args as []),
}));

vi.mock('./gamePhaseService', () => ({
  getPhaseBreakdown: (...args: unknown[]): unknown => mockGetPhaseBreakdown(...args as []),
  // Stub the rest of the module surface so importers don't hit an
  // undefined export (the factory replaces the WHOLE module).
  classifyPhase: (): string => 'middlegame',
  countMaterial: (): number => 0,
}));

vi.mock('./missedTacticService', () => ({
  detectMissedTactics: (...args: unknown[]): unknown => mockDetectMissedTactics(...args as []),
}));

vi.mock('./mistakePuzzleService', () => ({
  getMistakePuzzleStats: (...args: unknown[]): unknown => mockGetMistakePuzzleStats(...args as []),
}));

vi.mock('./openingService', () => ({
  getRepertoireOpenings: vi.fn().mockResolvedValue([]),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyClassifications(): MoveClassificationCounts {
  return { brilliant: 0, great: 0, good: 0, book: 0, miss: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

function buildCoachMove(overrides?: Partial<CoachGameMove>): CoachGameMove {
  return {
    moveNumber: 1,
    san: 'e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    isCoachMove: false,
    commentary: '',
    evaluation: 0,
    classification: 'good',
    expanded: false,
    bestMove: 'e4',
    bestMoveEval: 0,
    preMoveEval: 0,
    ...overrides,
  };
}

function setupAnnotatedMocks(): void {
  mockReconstructMovesFromGame.mockReturnValue([
    buildCoachMove({ moveNumber: 1, san: 'e4', classification: 'good', isCoachMove: false }),
    buildCoachMove({ moveNumber: 2, san: 'e5', classification: 'good', isCoachMove: true }),
  ]);
  mockCalculateAccuracy.mockReturnValue({ white: 85, black: 78, moveCount: 2 });
  mockGetClassificationCounts.mockReturnValue(emptyClassifications());
  mockGetPhaseBreakdown.mockReturnValue([]);
  mockDetectMissedTactics.mockReturnValue([]);
  mockGetMistakePuzzleStats.mockResolvedValue({
    total: 0,
    unsolved: 0,
    solved: 0,
    mastered: 0,
    dueCount: 0,
    byClassification: { inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
    byPhase: { opening: 0, middlegame: 0, endgame: 0 },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('gameInsightsService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    resetFactoryCounter();
    vi.clearAllMocks();
    setupAnnotatedMocks();
  });

  describe('getOverviewInsights', () => {
    it('returns zeros when no games exist', async () => {
      const { getOverviewInsights } = await import('./gameInsightsService');
      const result = await getOverviewInsights();

      expect(result.totalGames).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(0);
      expect(result.draws).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.avgElo).toBe(0);
      expect(result.avgAccuracy).toBe(0);
      expect(result.highestBeaten).toBeNull();
      expect(result.lowestLostTo).toBeNull();
    }, 15000); // first dynamic import + module init runs ~4s; tight against the
    // default 5s under ship-check's parallel CPU load. Generous ceiling.

    it('returns correct W/L/D counts and win rates', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      const ann = [{ moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 0, bestMove: 'e4', classification: 'good' as const }];
      // 2 wins, 1 loss, 1 draw as white (AI opponent = black means player is white)
      await db.games.bulkAdd([
        buildGameRecord({ id: 'g1', white: 'TestUser', black: 'AI Coach', result: '1-0', blackElo: 1500, eco: 'C65', annotations: ann }),
        buildGameRecord({ id: 'g2', white: 'TestUser', black: 'AI Coach', result: '1-0', blackElo: 1600, eco: 'C65', annotations: ann }),
        buildGameRecord({ id: 'g3', white: 'TestUser', black: 'AI Coach', result: '0-1', blackElo: 1200, eco: 'C65', annotations: ann }),
        buildGameRecord({ id: 'g4', white: 'TestUser', black: 'AI Coach', result: '1/2-1/2', blackElo: 1400, eco: 'C65', annotations: ann }),
      ]);

      const { getOverviewInsights } = await import('./gameInsightsService');
      const result = await getOverviewInsights();

      expect(result.totalGames).toBe(4);
      expect(result.wins).toBe(2);
      expect(result.losses).toBe(1);
      expect(result.draws).toBe(1);
      expect(result.winRate).toBe(50);
    });

    it('computes accuracy from fully-analyzed games', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      // Default PGN has 6 plies (1.e4 e5 2.Nf3 Nc6 3.Bb5 a6). Provide an
      // annotation per ply so gameNeedsAnalysis() returns false. Evals
      // are centipawns (White POV) with `bestMoveEval` set — matches
      // the post-ship-1 annotation shape so gameNeedsAnalysis doesn't
      // flag the record as a pre-fix legacy record.
      const fullAnnotations = [
        { moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 30, bestMove: 'e4', bestMoveEval: 0, classification: 'good' as const, comment: null },
        { moveNumber: 1, color: 'black' as const, san: 'e5', evaluation: 20, bestMove: 'e5', bestMoveEval: 30, classification: 'good' as const, comment: null },
        { moveNumber: 2, color: 'white' as const, san: 'Nf3', evaluation: 30, bestMove: 'Nf3', bestMoveEval: 20, classification: 'good' as const, comment: null },
        { moveNumber: 2, color: 'black' as const, san: 'Nc6', evaluation: 20, bestMove: 'Nc6', bestMoveEval: 30, classification: 'good' as const, comment: null },
        { moveNumber: 3, color: 'white' as const, san: 'Bb5', evaluation: 30, bestMove: 'Bb5', bestMoveEval: 20, classification: 'good' as const, comment: null },
        { moveNumber: 3, color: 'black' as const, san: 'a6', evaluation: 20, bestMove: 'a6', bestMoveEval: 30, classification: 'good' as const, comment: null },
      ];

      await db.games.add(
        buildGameRecord({
          id: 'g1',
          white: 'TestUser',
          black: 'AI Coach',
          result: '1-0',
          blackElo: 1500,
          eco: 'C65',
          annotations: fullAnnotations,
          fullyAnalyzed: true,
        }),
      );

      const { getOverviewInsights } = await import('./gameInsightsService');
      const result = await getOverviewInsights();

      expect(result.analyzedGameCount).toBe(1);
      expect(result.gamesNeedingAnalysis).toBe(0);
      expect(result.avgAccuracy).toBeGreaterThan(0);
      expect(result.accuracyWhite).toBeGreaterThan(0);
    });

    it('treats sparse-annotation games as needing analysis (no accuracy contribution)', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      // Sparse annotations — what detectBlunders() emits on import. The
      // game has 6 plies but only 1 annotation, so it should be flagged
      // as needing analysis and excluded from accuracy averages.
      await db.games.add(
        buildGameRecord({
          id: 'g1',
          white: 'TestUser',
          black: 'AI Coach',
          result: '1-0',
          blackElo: 1500,
          eco: 'C65',
          annotations: [
            { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0.3, bestMove: 'e4', classification: 'good' },
          ],
        }),
      );

      const { getOverviewInsights } = await import('./gameInsightsService');
      const result = await getOverviewInsights();

      expect(result.totalGames).toBe(1);
      expect(result.analyzedGameCount).toBe(0);
      expect(result.gamesNeedingAnalysis).toBe(1);
      expect(result.avgAccuracy).toBe(0);
      expect(result.strengths).not.toContain('1 games with zero blunders');
    });

    it('tracks highest beaten and lowest lost to', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      const ann = [{ moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 0, bestMove: 'e4', classification: 'good' as const }];
      await db.games.bulkAdd([
        buildGameRecord({ id: 'g1', white: 'TestUser', black: 'AI Coach', result: '1-0', blackElo: 1800, annotations: ann }),
        buildGameRecord({ id: 'g2', white: 'TestUser', black: 'AI Coach', result: '1-0', blackElo: 1600, annotations: ann }),
        buildGameRecord({ id: 'g3', white: 'TestUser', black: 'AI Coach', result: '0-1', blackElo: 1100, annotations: ann }),
        buildGameRecord({ id: 'g4', white: 'TestUser', black: 'AI Coach', result: '0-1', blackElo: 1300, annotations: ann }),
      ]);

      const { getOverviewInsights } = await import('./gameInsightsService');
      const result = await getOverviewInsights();

      expect(result.highestBeaten).not.toBeNull();
      expect(result.highestBeaten?.elo).toBe(1800);
      expect(result.lowestLostTo).not.toBeNull();
      expect(result.lowestLostTo?.elo).toBe(1100);
    });
  });

  describe('getOpeningInsights', () => {
    it('groups games by ECO and computes repertoire coverage', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      const { getRepertoireOpenings } = await import('./openingService');
      (getRepertoireOpenings as ReturnType<typeof vi.fn>).mockResolvedValue([
        buildOpeningRecord({ eco: 'C65', name: 'Ruy Lopez', color: 'white' }),
      ]);

      await db.games.bulkAdd([
        buildGameRecord({ id: 'g1', white: 'TestUser', black: 'AI Coach', result: '1-0', eco: 'C65' }),
        buildGameRecord({ id: 'g2', white: 'TestUser', black: 'AI Coach', result: '1-0', eco: 'C65' }),
        buildGameRecord({ id: 'g3', white: 'TestUser', black: 'AI Coach', result: '0-1', eco: 'B20' }),
      ]);

      const { getOpeningInsights } = await import('./gameInsightsService');
      const result = await getOpeningInsights();

      expect(result.repertoireCoverage.inBook).toBe(2);
      expect(result.repertoireCoverage.offBook).toBe(1);
      expect(result.mostPlayedWhite.length).toBeGreaterThan(0);
    });

    it('coverage counts a game in-book ONLY when the repertoire entry matches the game COLOR (loop audit 2026-09-09)', async () => {
      // Real bug: a color-blind ECO set counted a game in-repertoire whenever the
      // ECO appeared in ANY repertoire entry — so facing an opening you only
      // prepared from the other color inflated coverage (David: 67% vs a true 51%).
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));
      const { getRepertoireOpenings } = await import('./openingService');
      (getRepertoireOpenings as ReturnType<typeof vi.fn>).mockResolvedValue([
        buildOpeningRecord({ eco: 'C41', name: 'Philidor Defence', color: 'black' }), // Black-only prep
      ]);
      await db.games.bulkAdd([
        // Black game in C41 → matches the Black repertoire entry → IN book.
        buildGameRecord({ id: 'gb', white: 'Opp', black: 'TestUser', result: '0-1', eco: 'C41' }),
        // White game in C41 → the player FACED a Philidor; he has no WHITE C41
        // prep, so this is OFF book (was wrongly counted in-book, color-blind).
        buildGameRecord({ id: 'gw', white: 'TestUser', black: 'Opp', result: '1-0', eco: 'C41' }),
      ]);

      const { getOpeningInsights } = await import('./gameInsightsService');
      const result = await getOpeningInsights();
      expect(result.repertoireCoverage.inBook).toBe(1);   // only the Black C41 game
      expect(result.repertoireCoverage.offBook).toBe(1);  // the White C41 game
    });

    it('names by-color bucket from the COLOR-matching repertoire entry, not a wrong-color one (loop audit 2026-09-09)', async () => {
      // Real bug: David has BOTH a White anti-Pirc and a Black Pirc at ECO B07;
      // a color-blind repertoire lookup stamped the White "Anti-Pirc" name over
      // his BLACK Pirc games in "Most played as Black".
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));
      const { getRepertoireOpenings } = await import('./openingService');
      (getRepertoireOpenings as ReturnType<typeof vi.fn>).mockResolvedValue([
        buildOpeningRecord({ eco: 'B07', name: 'Anti-Pirc: 150 Battery', color: 'white' }),
        buildOpeningRecord({ eco: 'B07', name: 'Pirc Defence', color: 'black' }),
      ]);
      await db.games.bulkAdd([
        buildGameRecord({ id: 'gb1', white: 'Opp', black: 'TestUser', result: '0-1', eco: 'B07' }),
        buildGameRecord({ id: 'gb2', white: 'Opp', black: 'TestUser', result: '1-0', eco: 'B07' }),
        buildGameRecord({ id: 'gw1', white: 'TestUser', black: 'Opp', result: '1-0', eco: 'B07' }),
      ]);

      const { getOpeningInsights } = await import('./gameInsightsService');
      const result = await getOpeningInsights();

      const black = result.mostPlayedBlack.find((o) => o.eco === 'B07');
      expect(black?.name).toBe('Pirc Defence');        // his Black games → Black name
      const white = result.mostPlayedWhite.find((o) => o.eco === 'B07');
      expect(white?.name).toBe('Anti-Pirc: 150 Battery'); // his White games → White name
    });

    it('splits win-rate/best/worst by COLOR for a two-sided ECO instead of merging (loop audit 2026-09-09 sweep)', async () => {
      // Same class as the coverage + most-played fixes: winRateByOpening /
      // bestResults / worstResults were aggregated by ECO ALONE, so B07 White
      // wins and B07 Black losses merged into one 50% blob with a wrong-color
      // name. They must be two color-correct entries: White Anti-Pirc at 100%,
      // Black Pirc at 0%.
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));
      const { getRepertoireOpenings } = await import('./openingService');
      (getRepertoireOpenings as ReturnType<typeof vi.fn>).mockResolvedValue([
        buildOpeningRecord({ eco: 'B07', name: 'Anti-Pirc: 150 Battery', color: 'white' }),
        buildOpeningRecord({ eco: 'B07', name: 'Pirc Defence', color: 'black' }),
      ]);
      await db.games.bulkAdd([
        // 3 White wins in B07
        buildGameRecord({ id: 'w1', white: 'TestUser', black: 'Opp', result: '1-0', eco: 'B07' }),
        buildGameRecord({ id: 'w2', white: 'TestUser', black: 'Opp', result: '1-0', eco: 'B07' }),
        buildGameRecord({ id: 'w3', white: 'TestUser', black: 'Opp', result: '1-0', eco: 'B07' }),
        // 3 Black losses in B07
        buildGameRecord({ id: 'b1', white: 'Opp', black: 'TestUser', result: '1-0', eco: 'B07' }),
        buildGameRecord({ id: 'b2', white: 'Opp', black: 'TestUser', result: '1-0', eco: 'B07' }),
        buildGameRecord({ id: 'b3', white: 'Opp', black: 'TestUser', result: '1-0', eco: 'B07' }),
      ]);

      const { getOpeningInsights } = await import('./gameInsightsService');
      const result = await getOpeningInsights();

      const b07 = result.winRateByOpening.filter((o) => o.eco === 'B07');
      expect(b07.length).toBe(2); // NOT merged into one
      const asWhite = b07.find((o) => o.color === 'white');
      const asBlack = b07.find((o) => o.color === 'black');
      expect(asWhite?.winRate).toBe(100);
      expect(asWhite?.name).toBe('Anti-Pirc: 150 Battery');
      expect(asBlack?.winRate).toBe(0);
      expect(asBlack?.name).toBe('Pirc Defence');
      // No merged 50% blob should exist for B07.
      expect(b07.some((o) => o.winRate === 50)).toBe(false);
    });

    it('returns empty arrays when no games exist', async () => {
      const { getOpeningInsights } = await import('./gameInsightsService');
      const result = await getOpeningInsights();

      expect(result.repertoireCoverage.inBook).toBe(0);
      expect(result.repertoireCoverage.offBook).toBe(0);
      expect(result.mostPlayedWhite).toEqual([]);
      expect(result.mostPlayedBlack).toEqual([]);
    });
  });

  describe('getMistakeInsights', () => {
    it('counts errors by classification', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'm1', classification: 'blunder', cpLoss: 300, gamePhase: 'opening', evalBefore: 150, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm2', classification: 'mistake', cpLoss: 100, gamePhase: 'middlegame', evalBefore: 50, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm3', classification: 'inaccuracy', cpLoss: 50, gamePhase: 'endgame', evalBefore: -200, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm4', classification: 'miss', cpLoss: 200, gamePhase: 'middlegame', evalBefore: 0, playerColor: 'white' }),
      ]);

      const { getMistakeInsights } = await import('./gameInsightsService');
      const result = await getMistakeInsights();

      expect(result.errorBreakdown.blunders).toBe(1);
      expect(result.errorBreakdown.mistakes).toBe(1);
      expect(result.errorBreakdown.inaccuracies).toBe(1);
      expect(result.missedWins).toBe(1);
    });

    it('counts errors by phase', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'm1', classification: 'blunder', cpLoss: 300, gamePhase: 'opening', evalBefore: 0, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm2', classification: 'mistake', cpLoss: 100, gamePhase: 'opening', evalBefore: 0, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm3', classification: 'mistake', cpLoss: 50, gamePhase: 'endgame', evalBefore: 0, playerColor: 'white' }),
      ]);

      const { getMistakeInsights } = await import('./gameInsightsService');
      const result = await getMistakeInsights();

      const openingPhase = result.errorsByPhase.find((p) => p.phase === 'opening');
      const endgamePhase = result.errorsByPhase.find((p) => p.phase === 'endgame');

      expect(openingPhase?.errors).toBe(2);
      expect(endgamePhase?.errors).toBe(1);
    });

    it('counts errors by situation', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'm1', classification: 'blunder', cpLoss: 300, gamePhase: 'opening', evalBefore: 200, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm2', classification: 'mistake', cpLoss: 100, gamePhase: 'middlegame', evalBefore: 0, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm3', classification: 'mistake', cpLoss: 50, gamePhase: 'endgame', evalBefore: -200, playerColor: 'white' }),
      ]);

      const { getMistakeInsights } = await import('./gameInsightsService');
      const result = await getMistakeInsights();

      expect(result.errorsBySituation.winning).toBe(1);
      expect(result.errorsBySituation.equal).toBe(1);
      expect(result.errorsBySituation.losing).toBe(1);
    });

    it('returns empty state when no mistake puzzles exist', async () => {
      const { getMistakeInsights } = await import('./gameInsightsService');
      const result = await getMistakeInsights();

      expect(result.errorBreakdown.blunders).toBe(0);
      expect(result.errorBreakdown.mistakes).toBe(0);
      expect(result.errorBreakdown.inaccuracies).toBe(0);
      expect(result.avgCpLoss).toBe(0);
      expect(result.costliestMistakes).toEqual([]);
    });

    it('returns costliest mistakes sorted by cpLoss', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'm1', classification: 'blunder', cpLoss: 500, gamePhase: 'middlegame', playerMoveSan: 'Qh5', evalBefore: 0, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm2', classification: 'mistake', cpLoss: 150, gamePhase: 'opening', playerMoveSan: 'Nf3', evalBefore: 0, playerColor: 'white' }),
        buildMistakePuzzle({ id: 'm3', classification: 'blunder', cpLoss: 800, gamePhase: 'endgame', playerMoveSan: 'Kf1', evalBefore: 0, playerColor: 'white' }),
      ]);

      const { getMistakeInsights } = await import('./gameInsightsService');
      const result = await getMistakeInsights();

      expect(result.costliestMistakes.length).toBe(3);
      expect(result.costliestMistakes[0].cpLoss).toBe(800);
      expect(result.costliestMistakes[1].cpLoss).toBe(500);
    });
  });

  describe('getTacticInsights', () => {
    it('counts brilliant and great moves', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      mockGetClassificationCounts.mockReturnValue({
        ...emptyClassifications(),
        brilliant: 2,
        great: 3,
      });

      await db.games.add(
        buildGameRecord({
          id: 'g1',
          white: 'TestUser',
          black: 'AI Coach',
          result: '1-0',
          eco: 'C65',
          annotations: [
            { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0, bestMove: 'e4', classification: 'brilliant' },
          ],
        }),
      );

      const { getTacticInsights } = await import('./gameInsightsService');
      const result = await getTacticInsights();

      expect(result.tacticsFound.brilliant).toBe(2);
      expect(result.tacticsFound.great).toBe(3);
    });

    it('detects missed tactics from the classifiedTactics store', async () => {
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));

      await db.games.add(
        buildGameRecord({
          id: 'g1',
          white: 'TestUser',
          black: 'AI Coach',
          result: '0-1',
          eco: 'C65',
          annotations: [
            { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0, bestMove: 'e4', classification: 'good' },
          ],
        }),
      );
      await db.classifiedTactics.add({
        id: 'ct1', sourceGameId: 'g1', moveIndex: 15, fen: 'some-fen',
        bestMoveUci: 'f3e5', bestMoveSan: 'Nxe5', playerMoveUci: 'g1f3', playerMoveSan: 'Nf3',
        playerColor: 'white', tacticType: 'fork', evalSwing: -300, explanation: 'Missed a knight fork',
        opponentName: 'AI Coach', gameDate: '2026-09-01', openingName: 'Ruy Lopez',
        puzzleAttempts: 0, puzzleSuccesses: 0, createdAt: '2026-09-01T00:00:00Z',
      });

      const { getTacticInsights } = await import('./gameInsightsService');
      const result = await getTacticInsights();

      expect(result.worstMisses.length).toBe(1);
      expect(result.missedByType.length).toBe(1);
      expect(result.missedByType[0].type).toBe('fork');
      expect(result.foundVsMissed.missed).toBe(1);
    });

    it('returns empty state when no games exist', async () => {
      const { getTacticInsights } = await import('./gameInsightsService');
      const result = await getTacticInsights();

      expect(result.tacticsFound.brilliant).toBe(0);
      expect(result.tacticsFound.great).toBe(0);
      expect(result.bestSequences).toEqual([]);
      expect(result.worstMisses).toEqual([]);
      expect(result.awarenessRate).toBe(0);
      expect(result.totalGames).toBe(0);
    });
  });

  describe('getGamesByOpening', () => {
    it('returns games filtered by ECO', async () => {
      await db.games.bulkAdd([
        buildGameRecord({ id: 'g1', eco: 'C65', isMasterGame: false }),
        buildGameRecord({ id: 'g2', eco: 'C65', isMasterGame: false }),
        buildGameRecord({ id: 'g3', eco: 'B20', isMasterGame: false }),
        buildGameRecord({ id: 'g4', eco: 'C65', isMasterGame: true }),
      ]);

      const { getGamesByOpening } = await import('./gameInsightsService');
      const result = await getGamesByOpening('C65');

      expect(result.length).toBe(2);
      expect(result.every((g) => g.eco === 'C65' && !g.isMasterGame)).toBe(true);
    });

    it('returns empty array for unknown ECO', async () => {
      const { getGamesByOpening } = await import('./gameInsightsService');
      const result = await getGamesByOpening('Z99');

      expect(result).toEqual([]);
    });
  });

  describe('getTacticInsights — reads missed tactics from classifiedTactics (David 2026-09-08)', () => {
    it('counts real missed tactics from the classifiedTactics store, not a null-gated 100%', async () => {
      // The bug: with missed tactics present the tab showed "100% tactical
      // awareness / no missed tactics" because it re-derived from raw annotations
      // (null bestMoveEval gate). It must now read classifiedTactics — the same
      // populated store the weakness spine reads.
      await db.profiles.add(buildUserProfile({ id: 'p1', name: 'TestUser' }));
      await db.games.add(buildGameRecord({ id: 'g1', eco: 'B22', isMasterGame: false }));
      await db.classifiedTactics.bulkAdd([
        {
          id: 'ct1', sourceGameId: 'g1', moveIndex: 18, fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          bestMoveUci: 'd5c7', bestMoveSan: 'Nc7+', playerMoveUci: 'e1e2', playerMoveSan: 'Ke2',
          playerColor: 'white', tacticType: 'fork', evalSwing: 320, explanation: 'Missed a knight fork.',
          opponentName: 'Opp', gameDate: '2026-09-01', openingName: 'Sicilian Defense: Alapin Variation',
          puzzleAttempts: 0, puzzleSuccesses: 0, createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'ct2', sourceGameId: 'g1', moveIndex: 24, fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          bestMoveUci: 'a1a8', bestMoveSan: 'Ra8', playerMoveUci: 'b1b2', playerMoveSan: 'Rb2',
          playerColor: 'white', tacticType: 'fork', evalSwing: 210, explanation: 'Another missed fork.',
          opponentName: 'Opp', gameDate: '2026-09-01', openingName: 'Sicilian Defense: Alapin Variation',
          puzzleAttempts: 0, puzzleSuccesses: 0, createdAt: '2026-09-01T00:00:00Z',
        },
      ]);

      const { getTacticInsights } = await import('./gameInsightsService');
      const insights = await getTacticInsights();

      expect(insights.foundVsMissed.missed).toBe(2);
      // With 0 found + 2 missed the awareness rate is 0%, NOT the bogus 100%.
      expect(insights.awarenessRate).toBe(0);
      const fork = insights.missedByType.find((t) => t.type === 'fork');
      expect(fork?.count).toBe(2);
      expect(insights.worstMisses.length).toBeGreaterThan(0);
      expect(insights.worstMisses[0].san).toBe('Ke2');
    }, 15000);
  });
});

describe('openingChoosingColor — White "…Attack" systems must not be filtered as Black (loop audit 2026-09-09)', () => {
  it('classifies White attack systems that COLLIDE with black keywords as White', async () => {
    const { openingChoosingColor } = await import('./gameInsightsService');
    // Real bug: KIA (A07) resolves to "King's Indian Attack", was caught by the
    // "indian" black keyword and vanished from "Most played as White".
    expect(openingChoosingColor("King's Indian Attack")).toBe('white');
    expect(openingChoosingColor("King's Indian Attack: Keres Variation")).toBe('white');
    expect(openingChoosingColor('Nimzowitsch-Larsen Attack')).toBe('white');
    expect(openingChoosingColor('Nimzo-Larsen Attack: Modern Variation')).toBe('white');
  });
  it('still classifies the Black Indians / defenses as Black', async () => {
    const { openingChoosingColor } = await import('./gameInsightsService');
    expect(openingChoosingColor("King's Indian Defense")).toBe('black');
    expect(openingChoosingColor('Nimzo-Indian Defense')).toBe('black');
    expect(openingChoosingColor("Queen's Indian Defense")).toBe('black');
    expect(openingChoosingColor('Nimzowitsch Defense')).toBe('black');
    expect(openingChoosingColor('Scandinavian Defense')).toBe('black');
    expect(openingChoosingColor('French Defense')).toBe('black');
  });
  it('leaves joint / White openings unclassified (bucketed by player color)', async () => {
    const { openingChoosingColor } = await import('./gameInsightsService');
    expect(openingChoosingColor('Italian Game')).toBeNull();
    expect(openingChoosingColor('London System')).toBeNull();
    expect(openingChoosingColor("King's Pawn Game")).toBeNull();
    expect(openingChoosingColor('Vienna Game')).toBeNull();
  });
});
