import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectStruggleTier,
  getCoachingMessage,
  getTacticLookahead,
  detectGameplayTactic,
  buildTacticAlertMessage,
  recordTacticOutcome,
  hasRecentFailure,
  clearSessionOutcomes,
  getSessionOutcomes,
} from './tacticAlertService';
import type { StockfishAnalysis } from '../types';

// Mock the async dependencies
vi.mock('./missedTacticService', () => ({
  detectTacticType: (fen: string, _bestMove: string): string => {
    if (fen.includes('fork')) return 'fork';
    if (fen.includes('pin')) return 'pin';
    return 'tactical_sequence';
  },
}));

vi.mock('./tacticalProfileService', () => ({
  getStoredTacticalProfile: (): Promise<null> => Promise.resolve(null),
}));

describe('tacticAlertService', () => {
  beforeEach(() => {
    clearSessionOutcomes();
  });

  // ─── Struggle Detection ───────────────────────────────────────────────────

  describe('detectStruggleTier', () => {
    it('returns none when no struggle signals', () => {
      expect(detectStruggleTier({
        elapsedSeconds: 5,
        wrongAttempts: 0,
        sameTypeFailed: false,
        playerRating: 1200,
      })).toBe('none');
    });

    it('returns nudge on first wrong attempt', () => {
      expect(detectStruggleTier({
        elapsedSeconds: 0,
        wrongAttempts: 1,
        sameTypeFailed: false,
        playerRating: 1200,
      })).toBe('nudge');
    });

    it('returns teach on second wrong attempt', () => {
      expect(detectStruggleTier({
        elapsedSeconds: 0,
        wrongAttempts: 2,
        sameTypeFailed: false,
        playerRating: 1200,
      })).toBe('teach');
    });

    it('returns guide on third wrong attempt', () => {
      expect(detectStruggleTier({
        elapsedSeconds: 0,
        wrongAttempts: 3,
        sameTypeFailed: false,
        playerRating: 1200,
      })).toBe('guide');
    });

    it('helps weaker players sooner (time-based)', () => {
      // 600-rated player: nudge threshold = 20 * 0.5 = 10s
      expect(detectStruggleTier({
        elapsedSeconds: 12,
        wrongAttempts: 0,
        sameTypeFailed: false,
        playerRating: 600,
      })).toBe('nudge');

      // 1600-rated player: nudge threshold = 20 * 1.0 = 20s
      expect(detectStruggleTier({
        elapsedSeconds: 12,
        wrongAttempts: 0,
        sameTypeFailed: false,
        playerRating: 1600,
      })).toBe('none');
    });

    it('escalates faster when same type recently failed', () => {
      expect(detectStruggleTier({
        elapsedSeconds: 0,
        wrongAttempts: 2,
        sameTypeFailed: true,
        playerRating: 1200,
      })).toBe('guide');
    });

    it('triggers nudge based on time alone', () => {
      expect(detectStruggleTier({
        elapsedSeconds: 25,
        wrongAttempts: 0,
        sameTypeFailed: false,
        playerRating: 1200,
      })).toBe('nudge');
    });
  });

  // ─── Coaching Messages ──────────────────────────────────────────────────

  describe('getCoachingMessage', () => {
    it('returns null for none tier', () => {
      expect(getCoachingMessage('fork', 'none', 1200)).toBeNull();
    });

    it('returns theme-specific nudge for nudge tier', () => {
      const msg = getCoachingMessage('fork', 'nudge', 1200);
      expect(msg).toContain('knight or queen');
    });

    it('returns beginner nudge for low-rated player', () => {
      const msg = getCoachingMessage('fork', 'nudge', 800);
      expect(msg).toContain('two things at once');
    });

    it('returns concept with hint for teach tier', () => {
      const msg = getCoachingMessage('fork', 'teach', 1200);
      expect(msg).toBeTruthy();
      expect(msg).toContain('fork attacks two or more');
      expect(msg).toContain('knight or queen');
    });

    it('returns beginner teach with concept for low-rated player', () => {
      const msg = getCoachingMessage('fork', 'teach', 800);
      expect(msg).toBeTruthy();
      expect(msg).toContain('two things at once');
      expect(msg).toContain('fork attacks');
    });

    it('returns full concept for guide tier', () => {
      const msg = getCoachingMessage('pin', 'guide', 1500);
      expect(msg).toBeTruthy();
      expect(msg).toContain('immobilize');
      expect(msg).toContain('Look along');
    });

    it('covers all tactic types without throwing', () => {
      const types: string[] = [
        'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank',
        'hanging_piece', 'promotion', 'deflection', 'overloaded_piece',
        'trapped_piece', 'clearance', 'interference', 'zwischenzug',
        'x_ray', 'double_check', 'tactical_sequence',
      ];
      for (const type of types) {
        for (const tier of ['nudge', 'teach', 'guide'] as const) {
          const msg = getCoachingMessage(type as Parameters<typeof getCoachingMessage>[0], tier, 1200);
          expect(msg).toBeTruthy();
        }
      }
    });
  });

  // ─── Alert Delay ──────────────────────────────────────────────────────────

  describe('getTacticLookahead', () => {
    it('returns 1 for beginners (alert 1 move ahead)', () => {
      expect(getTacticLookahead(800)).toBe(1);
    });

    it('returns 2 for intermediate players', () => {
      expect(getTacticLookahead(1200)).toBe(2);
    });

    it('returns 3 for advanced players', () => {
      expect(getTacticLookahead(1600)).toBe(3);
    });

    it('returns 4 for strong players (plan ahead)', () => {
      expect(getTacticLookahead(2000)).toBe(4);
    });
  });

  // ─── Gameplay Tactic Detection ────────────────────────────────────────────

  describe('detectGameplayTactic', () => {
    it('returns null when no best move', () => {
      const analysis: StockfishAnalysis = {
        bestMove: null,
        evaluation: 0,
        depth: 10,
        topLines: [],
        isMate: false,
        mateIn: null,
      };
      expect(detectGameplayTactic('some fen', analysis, 'white')).toBeNull();
    });

    it('returns null when eval gap is too small', () => {
      const analysis: StockfishAnalysis = {
        bestMove: 'e2e4',
        evaluation: 50,
        depth: 10,
        topLines: [
          { moves: ['e2e4'], evaluation: 50 },
          { moves: ['d2d4'], evaluation: 30 },
        ],
        isMate: false,
        mateIn: null,
      };
      expect(detectGameplayTactic('some fen', analysis, 'white')).toBeNull();
    });

    it('returns tactic type when eval gap is significant', () => {
      const analysis: StockfishAnalysis = {
        bestMove: 'e2e4',
        evaluation: 300,
        depth: 10,
        topLines: [
          { moves: ['e2e4'], evaluation: 300 },
          { moves: ['d2d4'], evaluation: 50 },
        ],
        isMate: false,
        mateIn: null,
      };
      // Our mock returns 'fork' for fen containing 'fork'
      expect(detectGameplayTactic('fork position', analysis, 'white')).toBe('fork');
    });

    it('returns null for generic tactical_sequence', () => {
      const analysis: StockfishAnalysis = {
        bestMove: 'e2e4',
        evaluation: 300,
        depth: 10,
        topLines: [
          { moves: ['e2e4'], evaluation: 300 },
          { moves: ['d2d4'], evaluation: 50 },
        ],
        isMate: false,
        mateIn: null,
      };
      // Our mock returns 'tactical_sequence' for unknown fen
      expect(detectGameplayTactic('unknown position', analysis, 'white')).toBeNull();
    });
  });

  // ─── Alert Messages ───────────────────────────────────────────────────────

  describe('buildTacticAlertMessage', () => {
    it('builds an available alert for beginners', () => {
      const msg = buildTacticAlertMessage('fork', 'available', 800, false);
      expect(msg).toContain('I see something');
    });

    it('builds a missed alert with takeback suggestion', () => {
      const msg = buildTacticAlertMessage('pin', 'missed', 1500, false);
      expect(msg).toContain('missed');
      expect(msg).toContain('taking the move back');
    });

    it('emphasizes weakness when tactic is a known weak area', () => {
      const msg = buildTacticAlertMessage('fork', 'missed', 1500, true);
      expect(msg).toContain('weaker areas');
    });

    it('builds an available alert mentioning the pattern for weakness', () => {
      const msg = buildTacticAlertMessage('skewer', 'available', 1500, true);
      expect(msg).toContain("pattern you've been working on");
    });
  });

  // ─── Session Tracking ─────────────────────────────────────────────────────

  describe('session outcome tracking', () => {
    it('tracks outcomes and detects recent failures', () => {
      expect(hasRecentFailure('fork')).toBe(false);

      recordTacticOutcome({
        tacticType: 'fork',
        found: false,
        wasCoached: false,
        context: 'gameplay',
      });

      expect(hasRecentFailure('fork')).toBe(true);
      expect(hasRecentFailure('pin')).toBe(false);
    });

    it('clears session outcomes', () => {
      recordTacticOutcome({
        tacticType: 'fork',
        found: false,
        wasCoached: false,
        context: 'drill',
      });

      clearSessionOutcomes();
      expect(getSessionOutcomes()).toHaveLength(0);
      expect(hasRecentFailure('fork')).toBe(false);
    });

    it('only checks last 5 outcomes', () => {
      recordTacticOutcome({ tacticType: 'fork', found: false, wasCoached: false, context: 'drill' });
      // Fill with 5 successful outcomes
      for (let i = 0; i < 5; i++) {
        recordTacticOutcome({ tacticType: 'pin', found: true, wasCoached: false, context: 'drill' });
      }
      // The fork failure is now beyond the last 5
      expect(hasRecentFailure('fork')).toBe(false);
    });
  });
});
