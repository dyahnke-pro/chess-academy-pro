import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildChatMessages, parseActionTags, parseAllTags, buildGameChatMessages, getGameSystemPromptAddition, getChatSystemPromptAdditions, formatAnalysisContext, getRecentGamesSummary } from './coachChatService';
import { db } from '../db/schema';
import type { ChatMessage, UserProfile, WeaknessProfile, GameRecord } from '../types';

const mockProfile: UserProfile = {
  id: 'main',
  name: 'TestPlayer',
  isKidMode: false,
  currentRating: 1420,
  puzzleRating: 1400,
  xp: 500,
  level: 3,
  currentStreak: 5,
  longestStreak: 10,
  streakFreezes: 1,
  lastActiveDate: '2026-03-05',
  achievements: [],
  skillRadar: { opening: 60, tactics: 70, endgame: 40, memory: 50, calculation: 55 },
  badHabits: [
    { id: 'weak-fork', description: 'Struggling with fork puzzles', occurrences: 3, lastSeen: '2026-03-04', isResolved: false },
  ],
  preferences: {
    theme: 'dark-modern',
    boardColor: 'classic',
    pieceSet: 'staunton',
    showEvalBar: true,
    showEngineLines: false,
    soundEnabled: true,
    voiceEnabled: true,
    dailySessionMinutes: 45,
    aiProvider: 'deepseek',
    apiKeyEncrypted: null,
    apiKeyIv: null,
    anthropicApiKeyEncrypted: null,
    anthropicApiKeyIv: null,
    preferredModel: { commentary: 'deepseek-chat', analysis: 'deepseek-reasoner', reports: 'deepseek-reasoner' },
    monthlyBudgetCap: null,
    estimatedSpend: 0,
    elevenlabsKeyEncrypted: null,
    elevenlabsKeyIv: null,
    elevenlabsVoiceId: null,
    voiceSpeed: 1.0,
    kokoroEnabled: true,
    kokoroVoiceId: 'af_bella',
      systemVoiceURI: null,
    highlightLastMove: true,
    showLegalMoves: true,
    showCoordinates: true,
    pieceAnimationSpeed: 'medium',
    boardOrientation: true,
    moveQualityFlash: true,
    showHints: true,
    moveMethod: 'both',
    moveConfirmation: false,
    autoPromoteQueen: true,
    pollyEnabled: false,
    pollyVoice: 'ruth',
    masterAllOff: false,
  },
};

describe('coachChatService', () => {
  describe('buildChatMessages', () => {
    it('builds messages from history', () => {
      const history: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: 1000 },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: 1001 },
      ];

      const result = buildChatMessages(history, mockProfile);
      expect(result.length).toBe(2);
      expect(result[0].role).toBe('user');
      // First message should include profile context
      expect(result[0].content).toContain('Player: TestPlayer');
    });

    it('limits to last 20 messages (10 pairs)', () => {
      const history: ChatMessage[] = [];
      for (let i = 0; i < 30; i++) {
        history.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: i * 1000,
        });
      }

      const result = buildChatMessages(history, mockProfile);
      expect(result.length).toBe(20);
    });

    it('includes profile context for short conversations', () => {
      const history: ChatMessage[] = [
        { id: '1', role: 'user', content: 'How should I study?', timestamp: 1000 },
      ];

      const result = buildChatMessages(history, mockProfile);
      expect(result[0].content).toContain('1420 ELO');
      expect(result[0].content).toContain('Struggling with fork puzzles');
    });
  });

  describe('parseActionTags', () => {
    it('extracts action tags from text', () => {
      const text = 'Try this drill [ACTION: drill_opening:sicilian-najdorf] for practice.';
      const result = parseActionTags(text);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toEqual({ type: 'drill_opening', id: 'sicilian-najdorf' });
      expect(result.cleanText).toBe('Try this drill  for practice.');
    });

    it('handles multiple action tags', () => {
      const text = '[ACTION: puzzle_theme:fork] and [ACTION: drill_opening:queens-gambit]';
      const result = parseActionTags(text);

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe('puzzle_theme');
      expect(result.actions[1].type).toBe('drill_opening');
    });

    it('returns empty actions for text without tags', () => {
      const text = 'Just a normal message without any actions.';
      const result = parseActionTags(text);

      expect(result.actions).toHaveLength(0);
      expect(result.cleanText).toBe(text);
    });
  });

  describe('parseAllTags', () => {
    it('extracts both action and board tags', () => {
      const text = 'Try this [ACTION: drill_opening:sicilian] and look [BOARD: arrow:e2-e4:green] here.';
      const result = parseAllTags(text);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('drill_opening');
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].type).toBe('arrow');
      expect(result.cleanText).toBe('Try this  and look  here.');
    });

    it('returns empty annotations when no board tags', () => {
      const text = 'Just a normal response.';
      const result = parseAllTags(text);
      expect(result.annotations).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
      expect(result.cleanText).toBe(text);
    });

    it('handles board tags with no action tags', () => {
      const text = 'Look at [BOARD: highlight:e4:yellow,d5:red] these squares.';
      const result = parseAllTags(text);
      expect(result.actions).toHaveLength(0);
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].type).toBe('highlight');
      expect(result.annotations[0].highlights).toHaveLength(2);
    });

    it('handles clear command', () => {
      const text = 'Okay [BOARD: clear] let me show something else.';
      const result = parseAllTags(text);
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].type).toBe('clear');
    });

    it('handles position command with FEN', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const text = `What if [BOARD: position:${fen}:After 1.e4] you played this?`;
      const result = parseAllTags(text);
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].type).toBe('show_position');
      expect(result.annotations[0].fen).toBe(fen);
      expect(result.annotations[0].label).toBe('After 1.e4');
    });
  });

  describe('parseActionTags — extended', () => {
    it('handles malformed action tags gracefully', () => {
      const text = 'Try [ACTION: incomplete] here';
      const result = parseActionTags(text);
      // Malformed tags (missing colon separator) should not be extracted
      expect(result.actions).toHaveLength(0);
    });

    it('extracts analyse_position action with FEN', () => {
      const text = 'Check this [ACTION: analyse_position:rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR]';
      const result = parseActionTags(text);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('analyse_position');
      expect(result.actions[0].id).toContain('rnbqkbnr');
    });

    it('extracts review_game action', () => {
      const text = 'Review [ACTION: review_game:game-123] to see';
      const result = parseActionTags(text);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('review_game');
      expect(result.actions[0].id).toBe('game-123');
    });
  });

  describe('buildChatMessages — extended', () => {
    it('truncates to 20 messages for long history', () => {
      const history: ChatMessage[] = [];
      for (let i = 0; i < 40; i++) {
        history.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: i * 1000,
        });
      }

      const result = buildChatMessages(history, mockProfile);
      expect(result.length).toBe(20);
    });

    it('returns profile context message for empty history', () => {
      const result = buildChatMessages([], mockProfile);
      // Empty history still returns a profile context wrapper
      expect(result.length).toBe(1);
      expect(result[0].content).toContain('Player context');
    });
  });

  // ─── New game chat tests ────────────────────────────────────────────────────

  describe('buildGameChatMessages', () => {
    const gameContext = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      pgn: '1.e4',
      moveNumber: 1,
      playerColor: 'white',
      turn: 'b',
      isGameOver: false,
      gameResult: 'ongoing',
    };

    it('injects game context for empty chat history', () => {
      const result = buildGameChatMessages([], gameContext, mockProfile);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].content).toContain('Game Context');
      expect(result[0].content).toContain('FEN:');
      expect(result[0].content).toContain('Player context');
    });

    it('includes FEN in game context', () => {
      const result = buildGameChatMessages([], gameContext, mockProfile);
      expect(result[0].content).toContain(gameContext.fen);
    });

    it('includes PGN in game context', () => {
      const result = buildGameChatMessages([], gameContext, mockProfile);
      expect(result[0].content).toContain('1.e4');
    });

    it('includes player color in game context', () => {
      const result = buildGameChatMessages([], gameContext, mockProfile);
      expect(result[0].content).toContain('Player plays: white');
    });

    it('includes player profile context', () => {
      const result = buildGameChatMessages([], gameContext, mockProfile);
      expect(result[0].content).toContain('TestPlayer');
      expect(result[0].content).toContain('1420 ELO');
    });

    it('handles short chat history', () => {
      const history: ChatMessage[] = [
        { id: '1', role: 'user', content: 'What should I play?', timestamp: 1000 },
      ];

      const result = buildGameChatMessages(history, gameContext, mockProfile);
      // Should include game context + user message merged
      expect(result[0].content).toContain('Game Context');
      expect(result[0].content).toContain('What should I play?');
    });

    it('includes game over status when game is over', () => {
      const overContext = { ...gameContext, isGameOver: true, gameResult: 'win' };
      const result = buildGameChatMessages([], overContext, mockProfile);
      expect(result[0].content).toContain('Game over');
      expect(result[0].content).toContain('win');
    });

    it('truncates long PGN', () => {
      const longPgn = Array.from({ length: 30 }, (_, i) => `move${i}`).join(' ');
      const longContext = { ...gameContext, pgn: longPgn };
      const result = buildGameChatMessages([], longContext, mockProfile);
      // PGN should be truncated with ... prefix
      expect(result[0].content).toContain('...');
    });

    it('limits history to last 20 messages', () => {
      const history: ChatMessage[] = [];
      for (let i = 0; i < 30; i++) {
        history.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: i * 1000,
        });
      }

      const result = buildGameChatMessages(history, gameContext, mockProfile);
      // Should have game context messages + limited history
      expect(result.length).toBeLessThanOrEqual(24); // 2 context + 20 + 2 context separator
    });
  });

  describe('getGameSystemPromptAddition', () => {
    it('returns game narration content', () => {
      const result = getGameSystemPromptAddition();
      expect(result).toContain('playing a chess game');
    });

    it('includes conciseness instruction', () => {
      const result = getGameSystemPromptAddition();
      expect(result).toContain('under 3 sentences');
    });

    it('includes more detail instruction for game over', () => {
      const result = getGameSystemPromptAddition();
      expect(result).toContain('more detailed when the game is over');
    });

    it('includes board annotation instructions', () => {
      const result = getGameSystemPromptAddition();
      expect(result).toContain('BOARD ANNOTATIONS');
      expect(result).toContain('[BOARD: arrow:');
      expect(result).toContain('[BOARD: highlight:');
      expect(result).toContain('[BOARD: position:');
      expect(result).toContain('[BOARD: clear]');
    });

    it('lists all annotation colors', () => {
      const result = getGameSystemPromptAddition();
      expect(result).toContain('green');
      expect(result).toContain('red');
      expect(result).toContain('blue');
      expect(result).toContain('yellow');
      expect(result).toContain('orange');
    });
  });

  // ─── Analysis context tests ──────────────────────────────────────────────

  describe('getChatSystemPromptAdditions', () => {
    it('returns base prompt without analysis flag', () => {
      const result = getChatSystemPromptAdditions();
      expect(result).toContain('conversation with a chess student');
      expect(result).not.toContain('Game Analysis Data');
    });

    it('returns base prompt when flag is false', () => {
      const result = getChatSystemPromptAdditions(false);
      expect(result).not.toContain('Game Analysis Data');
    });

    it('includes analysis instructions when flag is true', () => {
      const result = getChatSystemPromptAdditions(true);
      expect(result).toContain('Game Analysis Data');
      expect(result).toContain('Weakness Analysis');
      expect(result).toContain('Reference specific data points');
    });
  });

  describe('formatAnalysisContext', () => {
    const mockWeaknessProfile: WeaknessProfile = {
      computedAt: '2026-03-08T12:00:00Z',
      items: [
        {
          category: 'calculation',
          label: 'Frequent calculation errors',
          metric: '5 blunders, 12 mistakes in 20 games',
          severity: 70,
          detail: 'Error rate is 8.5%. Practice calculation exercises.',
        },
        {
          category: 'openings',
          label: 'Shaky in Sicilian Defense',
          metric: '40% drill accuracy',
          severity: 60,
          detail: 'Review the Sicilian main lines.',
        },
      ],
      strengths: ['Strong at pins (85% accuracy)', 'Good opening knowledge retention'],
      strengthItems: [],
      overallAssessment: 'Rating: ~1235 ELO. Primary focus: calculation errors.',
    };

    it('formats game summary without weakness profile', () => {
      const summary = {
        totalGames: 50,
        dateRange: { from: '2024-01-01', to: '2025-01-15' },
        asWhite: { wins: 15, losses: 8, draws: 2 },
        asBlack: { wins: 12, losses: 10, draws: 3 },
        topOpenings: [
          { eco: 'B20', name: 'Sicilian', count: 10, winRate: 60 },
          { eco: 'C50', name: 'Italian', count: 8, winRate: 75 },
        ],
        avgOpponentRating: 1300,
        source: 'chesscom',
      };

      const result = formatAnalysisContext(null, summary);
      expect(result).toContain('Game Analysis Data');
      expect(result).toContain('50');
      expect(result).toContain('chesscom');
      expect(result).toContain('B20');
      expect(result).toContain('1300');
      expect(result).not.toContain('Weakness Analysis');
    });

    it('includes weakness profile when provided', () => {
      const summary = {
        totalGames: 30,
        dateRange: { from: '2024-06-01', to: '2025-01-01' },
        asWhite: { wins: 10, losses: 5, draws: 0 },
        asBlack: { wins: 8, losses: 6, draws: 1 },
        topOpenings: [],
        avgOpponentRating: 1200,
        source: 'lichess',
      };

      const result = formatAnalysisContext(mockWeaknessProfile, summary);
      expect(result).toContain('Weakness Analysis');
      expect(result).toContain('Frequent calculation errors');
      expect(result).toContain('severity 70/100');
      expect(result).toContain('Strong at pins');
    });

    it('handles empty game summary', () => {
      const summary = {
        totalGames: 0,
        dateRange: null,
        asWhite: { wins: 0, losses: 0, draws: 0 },
        asBlack: { wins: 0, losses: 0, draws: 0 },
        topOpenings: [],
        avgOpponentRating: null,
        source: '',
      };

      const result = formatAnalysisContext(null, summary);
      expect(result).toContain('No recent games');
    });

    it('calculates win rates correctly', () => {
      const summary = {
        totalGames: 20,
        dateRange: { from: '2024-01-01', to: '2024-06-01' },
        asWhite: { wins: 6, losses: 3, draws: 1 },
        asBlack: { wins: 4, losses: 5, draws: 1 },
        topOpenings: [],
        avgOpponentRating: null,
        source: 'chesscom',
      };

      const result = formatAnalysisContext(null, summary);
      expect(result).toContain('60% win rate'); // White: 6/10 = 60%
      expect(result).toContain('40% win rate'); // Black: 4/10 = 40%
    });
  });

  describe('buildChatMessages with analysis context', () => {
    it('includes analysis context in profile context for short conversations', () => {
      const history: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Analyze my games', timestamp: 1000 },
      ];

      const analysisCtx = '[Game Analysis Data]\nRecent games: 50 from chesscom';

      const result = buildChatMessages(history, mockProfile, analysisCtx);
      expect(result[0].content).toContain('Game Analysis Data');
      expect(result[0].content).toContain('Analyze my games');
    });

    it('does not include analysis context when undefined', () => {
      const history: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: 1000 },
      ];

      const result = buildChatMessages(history, mockProfile);
      expect(result[0].content).not.toContain('Game Analysis Data');
    });
  });

  describe('getRecentGamesSummary', () => {
    beforeEach(async () => {
      await db.delete();
      await db.open();
      vi.restoreAllMocks();
    });

    it('returns empty summary when no games exist', async () => {
      const summary = await getRecentGamesSummary();
      expect(summary.totalGames).toBe(0);
      expect(summary.dateRange).toBeNull();
    });

    it('computes win/loss/draw stats', async () => {
      const games: GameRecord[] = [
        {
          id: 'g1', pgn: '', white: 'TestUser', black: 'Opp1', result: '1-0',
          date: '2025-01-01', event: 'Chess.com rapid', eco: 'B20', whiteElo: 1200,
          blackElo: 1300, source: 'chesscom', annotations: null, coachAnalysis: null,
          isMasterGame: false, openingId: null,
        },
        {
          id: 'g2', pgn: '', white: 'Opp2', black: 'TestUser', result: '0-1',
          date: '2025-01-02', event: 'Chess.com rapid', eco: 'C50', whiteElo: 1400,
          blackElo: 1200, source: 'chesscom', annotations: null, coachAnalysis: null,
          isMasterGame: false, openingId: null,
        },
        {
          id: 'g3', pgn: '', white: 'TestUser', black: 'Opp3', result: '1/2-1/2',
          date: '2025-01-03', event: 'Chess.com blitz', eco: 'B20', whiteElo: 1200,
          blackElo: 1250, source: 'chesscom', annotations: null, coachAnalysis: null,
          isMasterGame: false, openingId: null,
        },
      ];
      await db.games.bulkPut(games);

      const summary = await getRecentGamesSummary('testuser');
      expect(summary.totalGames).toBe(3);
      expect(summary.asWhite.wins).toBe(1);
      expect(summary.asWhite.draws).toBe(1);
      expect(summary.asBlack.wins).toBe(1);
    });

    it('computes top openings', async () => {
      const games: GameRecord[] = Array.from({ length: 5 }, (_, i) => ({
        id: `g${i}`, pgn: '', white: 'TestUser', black: 'Opp', result: '1-0' as const,
        date: `2025-01-0${i + 1}`, event: 'Chess.com rapid', eco: 'B20', whiteElo: 1200,
        blackElo: 1300, source: 'chesscom' as const, annotations: null, coachAnalysis: null,
        isMasterGame: false, openingId: null,
      }));
      await db.games.bulkPut(games);

      const summary = await getRecentGamesSummary('testuser');
      expect(summary.topOpenings.length).toBe(1);
      expect(summary.topOpenings[0].eco).toBe('B20');
      expect(summary.topOpenings[0].count).toBe(5);
    });

    it('computes average opponent rating', async () => {
      const games: GameRecord[] = [
        {
          id: 'g1', pgn: '', white: 'TestUser', black: 'Opp1', result: '1-0',
          date: '2025-01-01', event: 'test', eco: null, whiteElo: 1200,
          blackElo: 1300, source: 'chesscom', annotations: null, coachAnalysis: null,
          isMasterGame: false, openingId: null,
        },
        {
          id: 'g2', pgn: '', white: 'TestUser', black: 'Opp2', result: '0-1',
          date: '2025-01-02', event: 'test', eco: null, whiteElo: 1200,
          blackElo: 1500, source: 'chesscom', annotations: null, coachAnalysis: null,
          isMasterGame: false, openingId: null,
        },
      ];
      await db.games.bulkPut(games);

      const summary = await getRecentGamesSummary('testuser');
      expect(summary.avgOpponentRating).toBe(1400);
    });
  });
});
