/**
 * David 2026-09-24: "I don't want to hear the best move on every ply … key
 * moments where the user generally makes mistakes." The move is named on a
 * deciding moment, or where the student's OWN record says they go wrong —
 * never because of a rating, and never on a flat ply with an empty record.
 */
import { describe, it, expect } from 'vitest';
import { nextMoveAdvice, isDecidingMoment, phaseHole } from './nextMoveAdvice';
import type { WeaknessSignal } from './weaknessSignal';

function hole(over: Partial<WeaknessSignal>): WeaknessSignal {
  return {
    clusterId: 'analysis:phase:opening', bucket: 'opening', label: 'x',
    openCount: 2, severity: 50, puzzleThemes: [], total: 3,
    ...over,
  } as WeaknessSignal;
}

describe('nextMoveAdvice', () => {
  it('stays quiet on a flat ply with an empty record (the every-ply complaint)', () => {
    expect(nextMoveAdvice({ tier: 'none', phase: 'middlegame', weaknesses: [], motifHole: null }))
      .toEqual({ speak: false, reason: null });
    expect(nextMoveAdvice({ tier: 'teaching', phase: 'opening', weaknesses: [], motifHole: null }).speak).toBe(false);
  });

  it('names the move on a deciding moment even for a fresh install', () => {
    for (const tier of ['critical', 'only-move', 'swing', 'blunder', 'mate'] as const) {
      expect(nextMoveAdvice({ tier, phase: 'middlegame', weaknesses: [], motifHole: null }))
        .toEqual({ speak: true, reason: 'deciding' });
    }
  });

  it('a student who keeps erring in the opening hears it in the opening — from THEIR record', () => {
    const w = [hole({ clusterId: 'analysis:phase:opening', bucket: 'opening' })];
    expect(nextMoveAdvice({ tier: 'none', phase: 'opening', weaknesses: w, motifHole: null }))
      .toEqual({ speak: true, reason: 'phase-record' });
    // …and not in the middlegame, where their record is clean.
    expect(nextMoveAdvice({ tier: 'none', phase: 'middlegame', weaknesses: w, motifHole: null }).speak).toBe(false);
  });

  it('a typed endgame hole counts for the endgame', () => {
    const w = [hole({ clusterId: 'analysis:endgame-type:rook', bucket: 'endgame' })];
    expect(phaseHole('endgame', w)).not.toBeNull();
  });

  it('a fixed or closed hole is history, not need', () => {
    const fixed = [hole({ lifecycleStatus: 'fixed' })];
    const closed = [hole({ openCount: 0 })];
    expect(nextMoveAdvice({ tier: 'none', phase: 'opening', weaknesses: fixed, motifHole: null }).speak).toBe(false);
    expect(nextMoveAdvice({ tier: 'none', phase: 'opening', weaknesses: closed, motifHole: null }).speak).toBe(false);
  });

  it('a hole these facts hit (the need join) earns it anywhere', () => {
    const fork = hole({ clusterId: 'analysis:tactic:fork', bucket: 'tactical' });
    expect(nextMoveAdvice({ tier: 'none', phase: 'middlegame', weaknesses: [fork], motifHole: fork }))
      .toEqual({ speak: true, reason: 'motif-record' });
  });

  it('must-defend and teaching are not deciding tiers', () => {
    expect(isDecidingMoment('must-defend')).toBe(false);
    expect(isDecidingMoment('teaching')).toBe(false);
    expect(isDecidingMoment(undefined)).toBe(false);
  });
});
