import { describe, it, expect, beforeEach } from 'vitest';
import { buildChatMessages, parseActionTags, detectExpression, resetExpressionDebounce } from './coachChatService';
import type { ChatMessage, UserProfile } from '../types';

const mockProfile: UserProfile = {
  id: 'main',
  name: 'TestPlayer',
  isKidMode: false,
  coachPersonality: 'danya',
  currentRating: 1420,
  puzzleRating: 1400,
  xp: 500,
  level: 3,
  currentStreak: 5,
  longestStreak: 10,
  streakFreezes: 1,
  lastActiveDate: '2026-03-05',
  achievements: [],
  unlockedCoaches: ['danya'],
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
    apiKeyEncrypted: null,
    apiKeyIv: null,
    preferredModel: { commentary: 'claude-haiku-4-5-20251001', analysis: 'claude-sonnet-4-5-20250514', reports: 'claude-opus-4-5-20250514' },
    monthlyBudgetCap: null,
    estimatedSpend: 0,
    elevenlabsKeyEncrypted: null,
    elevenlabsKeyIv: null,
    voiceIdDanya: 'abc',
    voiceIdKasparov: 'def',
    voiceIdFischer: 'ghi',
    voiceSpeed: 1.0,
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

  describe('detectExpression', () => {
    beforeEach(() => {
      resetExpressionDebounce();
    });

    it('detects excited expression', () => {
      expect(detectExpression('That was brilliant!')).toBe('excited');
    });

    it('detects encouraging expression', () => {
      resetExpressionDebounce();
      expect(detectExpression('Good job, well done!')).toBe('encouraging');
    });

    it('detects disappointed expression', () => {
      resetExpressionDebounce();
      expect(detectExpression('That was a mistake unfortunately')).toBe('disappointed');
    });

    it('detects thinking expression', () => {
      resetExpressionDebounce();
      expect(detectExpression('Let me think about this position')).toBe('thinking');
    });

    it('returns neutral for unknown text', () => {
      resetExpressionDebounce();
      expect(detectExpression('The pawn is on e4')).toBe('neutral');
    });

    it('debounces expression changes', () => {
      resetExpressionDebounce();
      expect(detectExpression('Brilliant!')).toBe('excited');
      // Second call within debounce window returns neutral
      expect(detectExpression('Amazing!')).toBe('neutral');
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

  describe('detectExpression — keyword categories', () => {
    it('detects "amazing" as excited', () => {
      resetExpressionDebounce();
      expect(detectExpression('That was amazing play!')).toBe('excited');
    });

    it('detects "excellent" as excited', () => {
      resetExpressionDebounce();
      expect(detectExpression('Excellent move!')).toBe('excited');
    });

    it('detects "progress" as encouraging', () => {
      resetExpressionDebounce();
      expect(detectExpression('You are making great progress')).toBe('encouraging');
    });

    it('detects "blunder" as disappointed', () => {
      resetExpressionDebounce();
      expect(detectExpression('That was a blunder unfortunately')).toBe('disappointed');
    });

    it('detects "analyzing" as thinking', () => {
      resetExpressionDebounce();
      expect(detectExpression('I am analyzing the position')).toBe('thinking');
    });

    it('detects "complex" as thinking', () => {
      resetExpressionDebounce();
      expect(detectExpression('This is a complex position')).toBe('thinking');
    });
  });
});
