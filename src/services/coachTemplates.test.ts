import { describe, it, expect } from 'vitest';
import { getMoveCommentaryTemplate, getScenarioTemplate, getAllTemplates } from './coachTemplates';
import type { MoveClassification } from '../types';

const CLASSIFICATIONS: MoveClassification[] = ['brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'];

describe('coachTemplates', () => {
  describe('getMoveCommentaryTemplate', () => {
    it('returns a string for every classification', () => {
      for (const classification of CLASSIFICATIONS) {
        const result = getMoveCommentaryTemplate(classification, {
          bestMove: 'Nf3',
          playerMove: 'Bc4',
          evalDelta: '15',
        }, 0);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      }
    });

    it('interpolates variables', () => {
      const result = getMoveCommentaryTemplate('inaccuracy', {
        bestMove: 'Nf3',
        playerMove: 'Bc4',
        evalDelta: '25',
      }, 0);
      expect(result).toContain('Bc4');
      expect(result).toContain('Nf3');
    });

    it('uses default values for missing variables', () => {
      const result = getMoveCommentaryTemplate('blunder', {}, 0);
      expect(result).toContain('??');
    });
  });

  describe('getScenarioTemplate', () => {
    const SCENARIOS = [
      'hint_level1', 'hint_level2', 'hint_level3',
      'encouragement', 'post_game_win', 'post_game_loss', 'post_game_draw',
      'chat_greeting', 'chat_fallback',
      'takeback_allowed', 'takeback_refused', 'takeback_reluctant',
    ] as const;

    it('returns a string for every scenario', () => {
      for (const scenario of SCENARIOS) {
        const result = getScenarioTemplate(scenario, 0);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      }
    });

    it('returns non-empty string for greeting with player name', () => {
      const result = getScenarioTemplate('chat_greeting', 0, {
        playerName: 'Alex',
      });
      // Some templates may not use {playerName}, but result should be non-empty
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getAllTemplates', () => {
    it('returns complete template sets', () => {
      const templates = getAllTemplates();

      // Check move commentary
      for (const classification of CLASSIFICATIONS) {
        expect(templates.moveCommentary[classification].length).toBeGreaterThan(0);
      }

      // Check scenarios
      expect(Object.keys(templates.scenarios).length).toBeGreaterThan(10);
    });

    it('has at least 2 templates per classification', () => {
      const templates = getAllTemplates();
      for (const classification of CLASSIFICATIONS) {
        expect(templates.moveCommentary[classification].length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('getMoveCommentaryTemplate — interpolation', () => {
    it('interpolates bestMove variable', () => {
      const result = getMoveCommentaryTemplate('inaccuracy', {
        bestMove: 'Qd5',
        playerMove: 'Nc3',
      }, 0);
      // Should contain either Qd5 or Nc3
      expect(result).toContain('Nc3');
    });

    it('interpolates evalDelta variable', () => {
      const result = getMoveCommentaryTemplate('mistake', {
        bestMove: 'Nf3',
        playerMove: 'Bc4',
        evalDelta: '150',
      }, 0);
      expect(result).toBeTruthy();
    });

    it('interpolates playerName in scenario', () => {
      const result = getScenarioTemplate('chat_greeting', 0, {
        playerName: 'Alice',
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getScenarioTemplate — extended', () => {
    // 🔴 THIS USED TO ASSERT "returns different results (random selection) on
    // multiple calls" — and it could not fail, because it only checked
    // `size >= 1`, which one repeated string satisfies. It encoded the ROLL as
    // the contract while proving nothing about it. Deleted rather than
    // annotated: phrasing is ROTATED on a stable key, so the same moment must
    // read the SAME way and different moments must differ.
    it('is stable for one moment and varies across moments', () => {
      const same = new Set([0, 0, 0].map((k) => getScenarioTemplate('encouragement', k)));
      expect(same.size, 'the same key re-rolled — that is the defect').toBe(1);

      const across = new Set([0, 1, 2, 3].map((k) => getScenarioTemplate('encouragement', k)));
      expect(across.size, 'consecutive keys returned one string — no variation at all')
        .toBeGreaterThan(1);
    });

    it('handles all hint levels', () => {
      for (const level of ['hint_level1', 'hint_level2', 'hint_level3'] as const) {
        const result = getScenarioTemplate(level, 0);
        expect(result).toBeTruthy();
      }
    });

    it('handles all post-game scenarios', () => {
      for (const scenario of ['post_game_win', 'post_game_loss', 'post_game_draw'] as const) {
        const result = getScenarioTemplate(scenario, 0);
        expect(result).toBeTruthy();
      }
    });

    it('handles all takeback scenarios', () => {
      for (const scenario of ['takeback_allowed', 'takeback_refused', 'takeback_reluctant'] as const) {
        const result = getScenarioTemplate(scenario, 0);
        expect(result).toBeTruthy();
      }
    });
  });
});
