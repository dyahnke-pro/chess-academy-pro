/**
 * Pure-logic tests for the five live-coach trigger detectors
 * (WO-LIVE-COACH-01). Each detector is exercised in isolation; the
 * priority resolver is tested against composite signals.
 */
import { describe, it, expect } from 'vitest';
import {
  detectGreatMove,
  detectMissedTactic,
  detectOpponentBlunder,
  detectEvalSwingWrong,
  detectRecovery,
  evaluatePlayerMoveTriggers,
  evaluateOpponentMoveTriggers,
  pickHighestPriorityTrigger,
  type PlayerMoveSignal,
  type OpponentMoveSignal,
} from './liveCoachTriggers';

function playerSignal(overrides: Partial<PlayerMoveSignal> = {}): PlayerMoveSignal {
  return {
    evalBefore: 0,
    evalAfter: 0,
    bestMoveEval: 0,
    isBestMove: false,
    bestMoveWasTactical: false,
    hasHangingPiece: false,
    recentEvalHistory: [],
    ...overrides,
  };
}

function opponentSignal(overrides: Partial<OpponentMoveSignal> = {}): OpponentMoveSignal {
  return { evalBefore: 0, evalAfter: 0, ...overrides };
}

describe('detectGreatMove', () => {
  it('fires when delta ≥ +0.40 and student played the best move', () => {
    const r = detectGreatMove(playerSignal({
      evalBefore: 10,
      evalAfter: 60,
      bestMoveEval: 60,
      isBestMove: true,
    }));
    expect(r).not.toBeNull();
    expect(r?.trigger).toBe('great-move');
  });

  it('does NOT fire when delta is below +0.40', () => {
    expect(
      detectGreatMove(playerSignal({ evalBefore: 0, evalAfter: 30, isBestMove: true })),
    ).toBeNull();
  });

  it('does NOT fire when student did NOT play best (and not within 10cp)', () => {
    expect(
      detectGreatMove(playerSignal({
        evalBefore: 0,
        evalAfter: 50,
        bestMoveEval: 100,
        isBestMove: false,
      })),
    ).toBeNull();
  });
});

describe('detectMissedTactic', () => {
  it('fires when gap ≥ +1.00 and best was tactical', () => {
    const r = detectMissedTactic(playerSignal({
      evalAfter: 0,
      bestMoveEval: 150,
      isBestMove: false,
      bestMoveWasTactical: true,
    }));
    expect(r?.trigger).toBe('missed-tactic');
  });

  it('does NOT fire when student played the best move', () => {
    expect(
      detectMissedTactic(playerSignal({
        evalAfter: 0,
        bestMoveEval: 200,
        isBestMove: true,
        bestMoveWasTactical: true,
      })),
    ).toBeNull();
  });

  it('does NOT fire when best move was not tactical', () => {
    expect(
      detectMissedTactic(playerSignal({
        evalAfter: 0,
        bestMoveEval: 200,
        isBestMove: false,
        bestMoveWasTactical: false,
      })),
    ).toBeNull();
  });
});

describe('detectOpponentBlunder', () => {
  it('fires when opponent eval drops ≥ 1.50 in student favor', () => {
    const r = detectOpponentBlunder(opponentSignal({ evalBefore: 0, evalAfter: 200 }));
    expect(r?.trigger).toBe('opponent-blunder');
  });

  it('does NOT fire on small drops', () => {
    expect(
      detectOpponentBlunder(opponentSignal({ evalBefore: 0, evalAfter: 80 })),
    ).toBeNull();
  });
});

describe('detectEvalSwingWrong', () => {
  it('fires when student eval drops ≥ 0.80', () => {
    const r = detectEvalSwingWrong(playerSignal({ evalBefore: 0, evalAfter: -100 }));
    expect(r?.trigger).toBe('eval-swing-wrong');
  });

  it('suppresses when a hanging piece is present (blunder alert handles it)', () => {
    expect(
      detectEvalSwingWrong(playerSignal({
        evalBefore: 0,
        evalAfter: -200,
        hasHangingPiece: true,
      })),
    ).toBeNull();
  });

  it('does NOT fire on small positional drops', () => {
    expect(
      detectEvalSwingWrong(playerSignal({ evalBefore: 0, evalAfter: -50 })),
    ).toBeNull();
  });
});

describe('detectRecovery', () => {
  it('fires when worst recent ≤ -2.00 and current within ±0.50', () => {
    const r = detectRecovery(playerSignal({
      evalAfter: -20,
      recentEvalHistory: [-50, -150, -250, -100, -20],
    }));
    expect(r?.trigger).toBe('recovery');
  });

  it('does NOT fire when current is still well below 0', () => {
    expect(
      detectRecovery(playerSignal({
        evalAfter: -150,
        recentEvalHistory: [-50, -150, -250, -200, -150],
      })),
    ).toBeNull();
  });

  it('does NOT fire when recent worst was not below -2.00', () => {
    expect(
      detectRecovery(playerSignal({
        evalAfter: 0,
        recentEvalHistory: [-50, -120, -80, 0, 0],
      })),
    ).toBeNull();
  });
});

describe('priority resolution', () => {
  it('opponent-blunder beats every other trigger', () => {
    const result = pickHighestPriorityTrigger([
      { trigger: 'recovery', payload: {} },
      { trigger: 'opponent-blunder', payload: {} },
      { trigger: 'great-move', payload: {} },
    ]);
    expect(result.winner?.trigger).toBe('opponent-blunder');
    expect(result.suppressed).toHaveLength(2);
  });

  it('great-move beats missed-tactic, eval-swing-wrong, recovery', () => {
    const r = pickHighestPriorityTrigger([
      { trigger: 'eval-swing-wrong', payload: {} },
      { trigger: 'great-move', payload: {} },
      { trigger: 'missed-tactic', payload: {} },
    ]);
    expect(r.winner?.trigger).toBe('great-move');
  });

  it('returns null winner when all are null', () => {
    const r = pickHighestPriorityTrigger([null, null]);
    expect(r.winner).toBeNull();
    expect(r.suppressed).toHaveLength(0);
  });
});

describe('evaluatePlayerMoveTriggers — composite', () => {
  it('returns the highest-priority winner among student-side detectors', () => {
    // Configure a signal that fires both great-move AND eval-swing-wrong is
    // impossible (one is delta+, the other delta-). Test the typical case:
    // great-move alone.
    const r = evaluatePlayerMoveTriggers(playerSignal({
      evalBefore: 0,
      evalAfter: 80,
      bestMoveEval: 80,
      isBestMove: true,
    }));
    expect(r.winner?.trigger).toBe('great-move');
  });

  it('returns null when no trigger qualifies', () => {
    const r = evaluatePlayerMoveTriggers(playerSignal({ evalBefore: 0, evalAfter: 5 }));
    expect(r.winner).toBeNull();
  });
});

describe('evaluateOpponentMoveTriggers', () => {
  it('returns opponent-blunder when threshold is met', () => {
    const r = evaluateOpponentMoveTriggers(opponentSignal({ evalBefore: -50, evalAfter: 250 }));
    expect(r.winner?.trigger).toBe('opponent-blunder');
  });

  it('returns null when opponent move was fine', () => {
    const r = evaluateOpponentMoveTriggers(opponentSignal({ evalBefore: 0, evalAfter: 30 }));
    expect(r.winner).toBeNull();
  });
});
