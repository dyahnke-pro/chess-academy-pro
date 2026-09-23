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
      // 600-rated player: nudge threshold = 60 * 0.5 = 30s
      expect(detectStruggleTier({
        elapsedSeconds: 35,
        wrongAttempts: 0,
        sameTypeFailed: false,
        playerRating: 600,
      })).toBe('nudge');

      // 1600-rated player: nudge threshold = 60 * 1.0 = 60s
      expect(detectStruggleTier({
        elapsedSeconds: 35,
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
      // 1200-rated player: nudge threshold = 60 * 1.0 = 60s
      expect(detectStruggleTier({
        elapsedSeconds: 65,
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

    it('returns concept with hint for teach tier — the concept is the ENGINE\'s invariant (one voice, P4b)', () => {
      const msg = getCoachingMessage('fork', 'teach', 1200);
      expect(msg).toBeTruthy();
      expect(msg).toContain('fork hits two targets at once');
      expect(msg).toContain('knight or queen');
    });

    it('returns beginner teach with concept for low-rated player', () => {
      const msg = getCoachingMessage('fork', 'teach', 800);
      expect(msg).toBeTruthy();
      expect(msg).toContain('two things at once');
      expect(msg).toContain('fork hits');
    });

    it('returns full concept for guide tier', () => {
      const msg = getCoachingMessage('pin', 'guide', 1500);
      expect(msg).toBeTruthy();
      expect(msg).toContain('freezes the piece in front');
      expect(msg).toContain('Look along');
    });

    it('covers all tactic types without throwing', () => {
      const types: string[] = [
        'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank',
        'hanging_piece', 'promotion', 'deflection', 'overloaded_piece',
        'trapped_piece', 'clearance', 'interference', 'zwischenzug',
        'x_ray', 'double_check', 'removing_the_guard', 'checkmate', 'tactical_sequence',
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
    it('returns 1 for beginners (immediate threat only)', () => {
      expect(getTacticLookahead(800)).toBe(1);
    });

    it('returns 2 for improvers (1 full move)', () => {
      expect(getTacticLookahead(1200)).toBe(2);
    });

    it('returns 6 for intermediate players (3 full moves)', () => {
      expect(getTacticLookahead(1600)).toBe(6);
    });

    it('returns 10 for advanced players (5 full moves)', () => {
      expect(getTacticLookahead(2000)).toBe(10);
    });

    // Adaptive: tactics skill (0-100) pushes the horizon out, open-ended.
    it('leaves the baseline unchanged for average tactical skill (<= 60)', () => {
      expect(getTacticLookahead(1600, 55)).toBe(6);
      expect(getTacticLookahead(2000, 60)).toBe(10);
    });

    it('extends the horizon for strong/improving tacticians (+1 move per 20 pts over 60)', () => {
      expect(getTacticLookahead(1600, 80)).toBe(8);   // intermediate + strong tactics → 4 moves
      expect(getTacticLookahead(1600, 100)).toBe(10); // → 5 moves
      expect(getTacticLookahead(2000, 100)).toBe(14); // advanced + elite tactics → 7 moves (open-ended)
    });

    it('never over-faces a raw beginner even with high tactics skill', () => {
      expect(getTacticLookahead(800, 100)).toBe(1);
    });

    it('is backward compatible when no tactics skill is supplied', () => {
      expect(getTacticLookahead(1600)).toBe(6);
    });
  });

  // ─── Gameplay Tactic Detection ────────────────────────────────────────────

  describe('detectGameplayTactic', () => {
    it('returns null when no best move', () => {
      const analysis: StockfishAnalysis = {
        bestMove: null as unknown as string,
        evaluation: 0,
        depth: 10,
        topLines: [],
        isMate: false,
        mateIn: null, nodesPerSecond: 0,
      };
      expect(detectGameplayTactic('some fen', analysis, 'white')).toBeNull();
    });

    it('returns null when eval gap is too small', () => {
      const analysis: StockfishAnalysis = {
        bestMove: 'e2e4',
        evaluation: 50,
        depth: 10,
        topLines: [
          { rank: 1, moves: ['e2e4'], evaluation: 50 , mate: null },
          { rank: 1, moves: ['d2d4'], evaluation: 30 , mate: null },
        ],
        isMate: false,
        mateIn: null, nodesPerSecond: 0,
      };
      expect(detectGameplayTactic('some fen', analysis, 'white')).toBeNull();
    });

    it('returns tactic type when eval gap is significant', () => {
      const analysis: StockfishAnalysis = {
        bestMove: 'e2e4',
        evaluation: 300,
        depth: 10,
        topLines: [
          { rank: 1, moves: ['e2e4'], evaluation: 300 , mate: null },
          { rank: 1, moves: ['d2d4'], evaluation: 50 , mate: null },
        ],
        isMate: false,
        mateIn: null, nodesPerSecond: 0,
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
          { rank: 1, moves: ['e2e4'], evaluation: 300 , mate: null },
          { rank: 1, moves: ['d2d4'], evaluation: 50 , mate: null },
        ],
        isMate: false,
        mateIn: null, nodesPerSecond: 0,
      };
      // Our mock returns 'tactical_sequence' for unknown fen
      expect(detectGameplayTactic('unknown position', analysis, 'white')).toBeNull();
    });
  });

  // ─── Alert Messages ───────────────────────────────────────────────────────

  describe('buildTacticAlertMessage', () => {
    it('builds an available alert for beginners', () => {
      const msg = buildTacticAlertMessage('fork', 'available', 800, false);
      expect(msg).toContain('You have a tactic');
    });

    // Walk 1 (2026-09-23): the takeback suggestion was dropped — Play is a pure
    // playing surface, and the line told a student to undo a move the coach had
    // already answered. The missed alert names the pattern to look for instead.
    it('builds a missed alert that names what to look for, never a takeback', () => {
      const msg = buildTacticAlertMessage('pin', 'missed', 1500, false);
      expect(msg).toContain('missed');
      expect(msg).not.toMatch(/tak(e|ing) the move back/i);
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

describe('isCriticalThreat — the victim moves first (walk 5, 2026-09-23)', () => {
  it('a "fork" by a knight that is simply recaptured is NOT critical (…Nc6 Nxc6 bxc6)', async () => {
    const { Chess } = await import('chess.js');
    const { isCriticalThreat } = await import('./tacticAlertService');
    // The prod board before 9…Nc6: Najdorf-style, White Qd3 Ba2 Nd4, Black castled.
    const c = new Chess('rnbq1rk1/1p2bppp/p2ppn2/8/P2NP3/2NQ4/BPP2PPP/R1B1K2R b KQ - 3 9');
    c.move('Nc6'); c.move('Nxc6');
    const fork = { pattern: { type: 'fork', description: 'Knight on c6 forks queen on d8 and bishop on e7' }, fen: c.fen(), lineEval: 0, lineMate: null };
    expect(isCriticalThreat(fork as never, 'b', false, 1400)).toBe(false);
  });

  it('a SAFE knight fork of king and rook still fires', async () => {
    const { isCriticalThreat } = await import('./tacticAlertService');
    // White knight on c7 checks the king on e8 and hits the rook on a8; nothing can take it.
    const fen = 'r3k3/2N5/8/8/8/8/5PPP/6K1 b - - 0 1';
    const fork = { pattern: { type: 'fork', description: 'Knight on c7 forks king on e8 and rook on a8' }, fen, lineEval: 0, lineMate: null };
    expect(isCriticalThreat(fork as never, 'b', false, 1400)).toBe(true);
  });
});
