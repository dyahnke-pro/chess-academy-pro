import { describe, it, expect, beforeEach } from 'vitest';
import { _testing, computeWeaknessProfile, getStoredWeaknessProfile, filterWeaknessesByCategory } from './weaknessAnalyzer';
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';
import type {
  GameRecord,
  SessionRecord,
  OpeningRecord,
  FlashcardRecord,
  MoveAnnotation,
  WeaknessProfile,
  MistakePuzzle,
} from '../types';
import type { ThemeSkill } from './puzzleService';

const {
  analyzeTactics,
  analyzeOpenings,
  analyzeGames,
  analyzeSessionConsistency,
  analyzeFlashcards,
  analyzeEndgame,
  analyzeMistakePuzzles,
  generateOverallAssessment,
  computeSkillRadar,
} = _testing;

// ─── Helpers ────────────────────────────────────────────────────────────────

function createAnnotation(
  moveNumber: number,
  classification: MoveAnnotation['classification'],
): MoveAnnotation {
  return {
    moveNumber,
    color: 'white',
    san: 'e4',
    evaluation: 0,
    bestMove: 'e4',
    classification,
    comment: null,
  };
}

function createGameWithAnnotations(
  id: string,
  annotations: MoveAnnotation[],
): GameRecord {
  return {
    id,
    pgn: '1. e4 e5',
    white: 'Player',
    black: 'Opponent',
    result: '1-0',
    date: new Date().toISOString().split('T')[0],
    event: 'Test',
    eco: 'B00',
    whiteElo: 1400,
    blackElo: 1400,
    source: 'coach',
    annotations,
    coachAnalysis: null,
    isMasterGame: false,
    openingId: null,
  };
}

function createSession(
  id: string,
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
  return {
    id,
    date: new Date().toISOString().split('T')[0],
    profileId: 'main',
    durationMinutes: 30,
    plan: { blocks: [], totalMinutes: 30 },
    completed: true,
    puzzlesSolved: 10,
    puzzleAccuracy: 70,
    xpEarned: 100,
    coachSummary: null,
    ...overrides,
  };
}

function createOpening(
  id: string,
  overrides: Partial<OpeningRecord> = {},
): OpeningRecord {
  return {
    id,
    eco: 'B00',
    name: `Opening ${id}`,
    pgn: '1. e4',
    uci: 'e2e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    color: 'white',
    style: 'aggressive',
    isRepertoire: true,
    overview: null,
    keyIdeas: null,
    traps: null,
    warnings: null,
    variations: null,
    drillAccuracy: 0.6,
    drillAttempts: 5,
    lastStudied: null,
    woodpeckerReps: 0,
    woodpeckerSpeed: null,
    woodpeckerLastDate: null,
    isFavorite: false,
    ...overrides,
  };
}

function createFlashcard(
  id: string,
  overrides: Partial<FlashcardRecord> = {},
): FlashcardRecord {
  return {
    id,
    openingId: 'op-1',
    type: 'best_move',
    questionFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    questionText: 'What move?',
    answerMove: 'e4',
    answerText: 'King pawn opening',
    srsInterval: 1,
    srsEaseFactor: 2.5,
    srsRepetitions: 1,
    srsDueDate: new Date().toISOString().split('T')[0],
    srsLastReview: null,
    ...overrides,
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('weaknessAnalyzer', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  // ─── analyzeTactics ─────────────────────────────────────────────────────

  describe('analyzeTactics', () => {
    it('identifies weak themes', () => {
      const skills: ThemeSkill[] = [
        { theme: 'fork', accuracy: 0.3, attempts: 10 },
        { theme: 'pin', accuracy: 0.8, attempts: 15 },
      ];

      const result = analyzeTactics(skills);

      expect(result.weaknesses).toHaveLength(1);
      expect(result.weaknesses[0].category).toBe('tactics');
      expect(result.weaknesses[0].label).toContain('fork');
      expect(result.weaknesses[0].severity).toBe(70);
    });

    it('identifies strengths', () => {
      const skills: ThemeSkill[] = [
        { theme: 'fork', accuracy: 0.85, attempts: 20 },
        { theme: 'pin', accuracy: 0.9, attempts: 15 },
      ];

      const result = analyzeTactics(skills);

      expect(result.weaknesses).toHaveLength(0);
      expect(result.strengths).toHaveLength(2);
      expect(result.strengths[0]).toContain('fork');
    });

    it('ignores themes with too few attempts', () => {
      const skills: ThemeSkill[] = [
        { theme: 'fork', accuracy: 0.1, attempts: 2 },
      ];

      const result = analyzeTactics(skills);

      expect(result.weaknesses).toHaveLength(0);
      expect(result.strengths).toHaveLength(0);
    });

    it('sorts weaknesses by severity (worst first)', () => {
      const skills: ThemeSkill[] = [
        { theme: 'fork', accuracy: 0.4, attempts: 10 },
        { theme: 'pin', accuracy: 0.2, attempts: 10 },
        { theme: 'skewer', accuracy: 0.3, attempts: 10 },
      ];

      const result = analyzeTactics(skills);

      expect(result.weaknesses).toHaveLength(3);
      expect(result.weaknesses[0].label).toContain('pin');
      expect(result.weaknesses[1].label).toContain('skewer');
      expect(result.weaknesses[2].label).toContain('fork');
    });
  });

  // ─── analyzeOpenings ────────────────────────────────────────────────────

  describe('analyzeOpenings', () => {
    it('identifies weak openings', () => {
      const openings = [
        createOpening('op-1', { name: 'Sicilian', drillAccuracy: 0.3, drillAttempts: 10 }),
        createOpening('op-2', { name: 'Italian', drillAccuracy: 0.8, drillAttempts: 10 }),
      ];

      const result = analyzeOpenings(openings);

      expect(result.weaknesses).toHaveLength(1);
      expect(result.weaknesses[0].label).toContain('Sicilian');
      expect(result.weaknesses[0].category).toBe('openings');
    });

    it('identifies strong openings', () => {
      const openings = [
        createOpening('op-1', { name: 'Italian', drillAccuracy: 0.85, drillAttempts: 20 }),
      ];

      const result = analyzeOpenings(openings);

      expect(result.strengths).toHaveLength(1);
      expect(result.strengths[0]).toContain('Italian');
    });
  });

  // ─── analyzeGames ──────────────────────────────────────────────────────

  describe('analyzeGames', () => {
    it('returns empty for no games', () => {
      const result = analyzeGames([]);
      expect(result.weaknesses).toHaveLength(0);
      expect(result.strengths).toHaveLength(0);
    });

    it('detects calculation errors from high error rate', () => {
      const annotations = [
        ...Array.from({ length: 5 }, (_, i) => createAnnotation(i + 1, 'good')),
        createAnnotation(6, 'blunder'),
        createAnnotation(7, 'mistake'),
        createAnnotation(8, 'blunder'),
      ];
      const games = [createGameWithAnnotations('g1', annotations)];

      const result = analyzeGames(games);

      const calcWeakness = result.weaknesses.find((w) => w.category === 'calculation');
      expect(calcWeakness).toBeDefined();
      expect(calcWeakness?.label).toContain('calculation errors');
    });

    it('detects late-game collapses', () => {
      // Create 5 games, each with late blunders
      const games = Array.from({ length: 5 }, (_, i) => {
        const annotations = [
          ...Array.from({ length: 20 }, (_, j) => createAnnotation(j + 1, 'good')),
          createAnnotation(21, 'blunder'),
          createAnnotation(22, 'mistake'),
        ];
        return createGameWithAnnotations(`g${i}`, annotations);
      });

      const result = analyzeGames(games);

      const calcWeakness = result.weaknesses.find((w) => w.category === 'calculation');
      expect(calcWeakness).toBeDefined();
      expect(calcWeakness?.label).toContain('Late-game');
    });

    it('detects high blunder rate', () => {
      const games = Array.from({ length: 3 }, (_, i) => {
        const annotations = [
          createAnnotation(1, 'good'),
          createAnnotation(2, 'blunder'),
          createAnnotation(3, 'blunder'),
          createAnnotation(4, 'blunder'),
        ];
        return createGameWithAnnotations(`g${i}`, annotations);
      });

      const result = analyzeGames(games);

      const blunderWeakness = result.weaknesses.find((w) => w.label.includes('blunder rate'));
      expect(blunderWeakness).toBeDefined();
    });

    it('identifies brilliant moves as strength', () => {
      const annotations = [
        createAnnotation(1, 'brilliant'),
        createAnnotation(2, 'brilliant'),
        createAnnotation(3, 'brilliant'),
        createAnnotation(4, 'good'),
      ];
      const games = [createGameWithAnnotations('g1', annotations)];

      const result = analyzeGames(games);

      expect(result.strengths.some((s) => s.includes('brilliant'))).toBe(true);
    });

    it('skips games without annotations', () => {
      const games: GameRecord[] = [
        {
          ...createGameWithAnnotations('g1', []),
          annotations: null,
        },
      ];

      const result = analyzeGames(games);
      expect(result.weaknesses).toHaveLength(0);
    });
  });

  // ─── analyzeSessionConsistency ─────────────────────────────────────────

  describe('analyzeSessionConsistency', () => {
    it('detects low session accuracy', () => {
      const sessions = [
        createSession('s1', { puzzleAccuracy: 30, completed: true }),
        createSession('s2', { puzzleAccuracy: 35, completed: true }),
        createSession('s3', { puzzleAccuracy: 40, completed: true }),
      ];

      const result = analyzeSessionConsistency(sessions);

      const accuracyWeakness = result.weaknesses.find((w) => w.label.includes('puzzle accuracy'));
      expect(accuracyWeakness).toBeDefined();
      expect(accuracyWeakness?.category).toBe('tactics');
    });

    it('identifies consistent training as strength', () => {
      const sessions = Array.from({ length: 7 }, (_, i) =>
        createSession(`s${i}`, {
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          puzzleAccuracy: 80,
          completed: true,
        }),
      );

      const result = analyzeSessionConsistency(sessions);

      expect(result.strengths.some((s) => s.includes('consistency'))).toBe(true);
    });

    it('returns empty for too few sessions', () => {
      const result = analyzeSessionConsistency([createSession('s1'), createSession('s2')]);
      expect(result.weaknesses).toHaveLength(0);
    });
  });

  // ─── analyzeFlashcards ────────────────────────────────────────────────

  describe('analyzeFlashcards', () => {
    it('identifies good retention as strength', () => {
      const flashcards = Array.from({ length: 25 }, (_, i) =>
        createFlashcard(`f${i}`, {
          srsEaseFactor: 2.7,
          srsLastReview: '2024-01-01',
          srsDueDate: '2099-01-01',
        }),
      );

      const result = analyzeFlashcards(flashcards);

      expect(result.strengths.some((s) => s.includes('retention'))).toBe(true);
    });

    it('returns empty for no flashcards', () => {
      const result = analyzeFlashcards([]);
      expect(result.weaknesses).toHaveLength(0);
    });
  });

  // ─── analyzeEndgame ───────────────────────────────────────────────────

  describe('analyzeEndgame', () => {
    it('detects weak endgame from puzzle data', () => {
      const skills: ThemeSkill[] = [
        { theme: 'endgame', accuracy: 0.3, attempts: 10 },
        { theme: 'fork', accuracy: 0.8, attempts: 10 },
      ];

      const result = analyzeEndgame(skills);

      expect(result.weaknesses).toHaveLength(1);
      expect(result.weaknesses[0].category).toBe('endgame');
    });

    it('identifies strong endgame', () => {
      const skills: ThemeSkill[] = [
        { theme: 'endgame', accuracy: 0.85, attempts: 20 },
      ];

      const result = analyzeEndgame(skills);

      expect(result.strengths).toHaveLength(1);
      expect(result.strengths[0]).toContain('endgame');
    });
  });

  // ─── generateOverallAssessment ────────────────────────────────────────

  describe('generateOverallAssessment', () => {
    it('generates assessment with weaknesses and strengths', () => {
      const profile = buildUserProfile({ currentRating: 1500, level: 5 });
      const items = [
        {
          category: 'tactics' as const,
          label: 'Weak at forks',
          metric: '30% accuracy',
          severity: 70,
          detail: 'Work on forks',
        },
      ];
      const strengths = ['Good at pins'];

      const result = generateOverallAssessment(profile, items, strengths);

      expect(result).toContain('1500');
      expect(result).toContain('Level 5');
      expect(result).toContain('forks');
      expect(result).toContain('pins');
    });

    it('handles no data scenario', () => {
      const profile = buildUserProfile();
      const result = generateOverallAssessment(profile, [], []);
      expect(result).toContain('Not enough data');
    });

    it('includes unresolved bad habits', () => {
      const profile = buildUserProfile({
        badHabits: [
          { id: 'h1', description: 'Time pressure blunders', occurrences: 3, lastSeen: '2024-01-01', isResolved: false },
        ],
      });
      const items = [
        { category: 'tactics' as const, label: 'X', metric: 'Y', severity: 50, detail: 'Z' },
      ];

      const result = generateOverallAssessment(profile, items, []);
      expect(result).toContain('Time pressure blunders');
    });
  });

  // ─── computeSkillRadar ────────────────────────────────────────────────

  describe('computeSkillRadar', () => {
    it('computes radar from real data', () => {
      const themeSkills: ThemeSkill[] = [
        { theme: 'fork', accuracy: 0.7, attempts: 10 },
        { theme: 'pin', accuracy: 0.6, attempts: 10 },
        { theme: 'endgame', accuracy: 0.5, attempts: 10 },
      ];
      const repertoire = [
        createOpening('op-1', { drillAccuracy: 0.8, drillAttempts: 10 }),
      ];
      const sessions: SessionRecord[] = [];
      const flashcards = [
        createFlashcard('f1', { srsEaseFactor: 2.6, srsLastReview: '2024-01-01' }),
      ];
      const games: GameRecord[] = [];

      const radar = computeSkillRadar(themeSkills, repertoire, sessions, flashcards, games);

      expect(radar.tactics).toBe(60); // (0.7 + 0.6 + 0.5) / 3 * 100 = 60
      expect(radar.opening).toBe(80);
      expect(radar.endgame).toBe(50);
      expect(radar.memory).toBeGreaterThan(50); // 2.6 * 40 = 104 → clamped to 100
      expect(radar.calculation).toBe(50); // No games
    });

    it('defaults to 50 when no data', () => {
      const radar = computeSkillRadar([], [], [], [], []);

      expect(radar.tactics).toBe(50);
      expect(radar.opening).toBe(50);
      expect(radar.endgame).toBe(50);
      expect(radar.memory).toBe(50);
      expect(radar.calculation).toBe(50);
    });

    it('clamps values to 0-100', () => {
      const themeSkills: ThemeSkill[] = [
        { theme: 'fork', accuracy: 1.0, attempts: 100 },
      ];

      const radar = computeSkillRadar(themeSkills, [], [], [], []);

      expect(radar.tactics).toBeLessThanOrEqual(100);
      expect(radar.tactics).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Integration: computeWeaknessProfile ──────────────────────────────

  describe('computeWeaknessProfile', () => {
    it('computes and persists a profile', async () => {
      const profile = buildUserProfile();
      await db.profiles.add(profile);

      // Add some puzzle data
      await db.puzzles.bulkAdd([
        {
          id: 'p1', fen: 'x', moves: 'x', rating: 1200, themes: ['fork'], openingTags: null,
          popularity: 0, nbPlays: 0, srsInterval: 1, srsEaseFactor: 2.5, srsRepetitions: 0,
          srsDueDate: '2024-01-01', srsLastReview: null, userRating: 1200, attempts: 10, successes: 3,
        },
      ]);

      const result = await computeWeaknessProfile(profile);

      expect(result.computedAt).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.overallAssessment).toBeDefined();

      // Verify persisted
      const stored = await getStoredWeaknessProfile();
      expect(stored).not.toBeNull();
      expect(stored?.computedAt).toBe(result.computedAt);
    });

    it('updates skill radar on profile', async () => {
      const profile = buildUserProfile();
      await db.profiles.add(profile);

      await computeWeaknessProfile(profile);

      const updated = await db.profiles.get(profile.id);
      expect(updated?.skillRadar).toBeDefined();
    });
  });

  // ─── getStoredWeaknessProfile ─────────────────────────────────────────

  describe('getStoredWeaknessProfile', () => {
    it('returns null when no profile stored', async () => {
      const result = await getStoredWeaknessProfile();
      expect(result).toBeNull();
    });

    it('returns stored profile', async () => {
      const wp: WeaknessProfile = {
        computedAt: '2024-01-01T00:00:00Z',
        items: [],
        strengths: ['Good at forks'],
        overallAssessment: 'Solid player',
      };
      await db.meta.put({ key: 'weakness_profile', value: JSON.stringify(wp) });

      const result = await getStoredWeaknessProfile();
      expect(result?.overallAssessment).toBe('Solid player');
      expect(result?.strengths).toEqual(['Good at forks']);
    });
  });

  // ─── filterWeaknessesByCategory ───────────────────────────────────────

  // ─── analyzeMistakePuzzles ──────────────────────────────────────────

  describe('analyzeMistakePuzzles', () => {
    function createMistakePuzzle(id: string, overrides: Partial<MistakePuzzle> = {}): MistakePuzzle {
      const today = new Date().toISOString().split('T')[0];
      return {
        id,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        playerMove: 'e7e5',
        playerMoveSan: 'e5',
        bestMove: 'd7d5',
        bestMoveSan: 'd5',
        moves: 'd7d5 e4d5',
        cpLoss: 150,
        classification: 'mistake',
        gamePhase: 'middlegame',
        moveNumber: 5,
        sourceGameId: 'g1',
        sourceMode: 'lichess',
        playerColor: 'white',
        promptText: 'Find the best move.',
        narration: { intro: '', moveNarrations: [], outro: '' },
        createdAt: new Date().toISOString(),
        opponentName: null,
        gameDate: null,
        openingName: null,
        evalBefore: null,
        srsInterval: 0,
        srsEaseFactor: 0,
        srsRepetitions: 0,
        srsDueDate: today,
        srsLastReview: null,
        status: 'unsolved',
        attempts: 0,
        successes: 0,
        ...overrides,
      };
    }

    it('returns empty for too few puzzles', () => {
      const puzzles = [createMistakePuzzle('p1'), createMistakePuzzle('p2')];
      const result = analyzeMistakePuzzles(puzzles);
      expect(result.weaknesses).toHaveLength(0);
      expect(result.strengths).toHaveLength(0);
    });

    it('detects when most mistakes are in one game phase', () => {
      const puzzles = [
        createMistakePuzzle('p1', { gamePhase: 'opening' }),
        createMistakePuzzle('p2', { gamePhase: 'opening' }),
        createMistakePuzzle('p3', { gamePhase: 'opening' }),
        createMistakePuzzle('p4', { gamePhase: 'middlegame' }),
      ];

      const result = analyzeMistakePuzzles(puzzles);
      const phaseWeakness = result.weaknesses.find((w) => w.label.includes('opening'));
      expect(phaseWeakness).toBeDefined();
      expect(phaseWeakness?.metric).toContain('3 of 4');
    });

    it('detects high blunder ratio', () => {
      const puzzles = [
        createMistakePuzzle('p1', { classification: 'blunder' }),
        createMistakePuzzle('p2', { classification: 'blunder' }),
        createMistakePuzzle('p3', { classification: 'blunder' }),
        createMistakePuzzle('p4', { classification: 'mistake' }),
      ];

      const result = analyzeMistakePuzzles(puzzles);
      const blunderWeakness = result.weaknesses.find((w) => w.label.includes('blunder'));
      expect(blunderWeakness).toBeDefined();
      expect(blunderWeakness?.category).toBe('calculation');
    });

    it('identifies high mastery rate as strength', () => {
      const puzzles = Array.from({ length: 10 }, (_, i) =>
        createMistakePuzzle(`p${i}`, { status: i < 5 ? 'mastered' : 'solved' }),
      );

      const result = analyzeMistakePuzzles(puzzles);
      expect(result.strengths.some((s) => s.includes('Mastered'))).toBe(true);
    });
  });

  describe('filterWeaknessesByCategory', () => {
    it('filters by category', () => {
      const wp: WeaknessProfile = {
        computedAt: '2024-01-01T00:00:00Z',
        items: [
          { category: 'tactics', label: 'Weak forks', metric: '30%', severity: 70, detail: '' },
          { category: 'openings', label: 'Shaky Sicilian', metric: '40%', severity: 60, detail: '' },
          { category: 'tactics', label: 'Weak pins', metric: '35%', severity: 65, detail: '' },
        ],
        strengths: [],
        overallAssessment: '',
      };

      const tactics = filterWeaknessesByCategory(wp, 'tactics');
      expect(tactics).toHaveLength(2);
      expect(tactics.every((i) => i.category === 'tactics')).toBe(true);

      const openings = filterWeaknessesByCategory(wp, 'openings');
      expect(openings).toHaveLength(1);
    });
  });
});
