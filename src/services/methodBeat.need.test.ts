import { describe, it, expect } from 'vitest';
import { methodBeatFor, type MethodSignals, type MethodHabit } from './methodBeat';

// ── THE METHOD BAR IS THE STUDENT'S RECORD, NOT A FLAT NUMBER ───────────────
// David 2026-09-16, reading the review of his own Alapin: the method layer was
// built, gated, and spoke ZERO times on a real game (2 inaccuracies, 2 mistakes,
// nothing sharper — nothing cleared `cpLoss >= 100` or tier critical). The high
// bars had been set earlier the SAME night because the beat fired on ten student
// plies in a row. Both failures are real; the bar was the wrong instrument for
// both. Need decides whether the habit is owed; SAY-ONCE stops the drumbeat.

const base = (o: Partial<MethodSignals> = {}): MethodSignals => ({
  tier: 'consequence', cpLossCp: 50, bestSan: 'Nxe5', ignoredThreat: false,
  isStudentMove: true, ...o,
});

describe('method beat — need-scaled bar', () => {
  it('a 50cp slip earns NO forcing beat for a student with no such hole', () => {
    expect(methodBeatFor(base())).toBeNull();
  });

  it('the SAME slip earns it when their own record says they miss forcing shots', () => {
    const beat = methodBeatFor(base({ habitNeed: { 'forcing-scan': true } }));
    expect(beat).toBeTruthy();
    expect(beat).toMatch(/check|captur|forcing/i);
  });

  it('a big slip still earns it with no need data (cold start is never mute)', () => {
    expect(methodBeatFor(base({ cpLossCp: 250 }))).toBeTruthy();
  });

  it('slow-down widens to blunder/swing only when that is their hole', () => {
    expect(methodBeatFor(base({ tier: 'blunder', bestSan: 'Nf3', cpLossCp: 300 }))).toBeNull();
    const beat = methodBeatFor(base({
      tier: 'blunder', bestSan: 'Nf3', cpLossCp: 300, habitNeed: { 'slow-down': true },
    }));
    expect(beat).toMatch(/slow down|clock|thinking time/i);
  });
});

describe('method beat — SAY-ONCE is what stops the drumbeat', () => {
  it('teaches a habit once per game, not once per slip', () => {
    const said = new Set<MethodHabit>();
    const spoken = Array.from({ length: 10 }, (_, i) =>
      methodBeatFor(base({ ignoredThreat: true, saidHabits: said }), i),
    ).filter(Boolean);
    // Ten ignored-threat plies. Before say-once this was ten beats in a row —
    // the exact drumbeat that made the bars get raised in the first place.
    expect(spoken).toHaveLength(1);
  });

  it('a DIFFERENT habit still speaks after the first is spent', () => {
    const said = new Set<MethodHabit>();
    expect(methodBeatFor(base({ ignoredThreat: true, saidHabits: said }))).toBeTruthy();
    const second = methodBeatFor(base({
      cpLossCp: 250, bestSan: 'Qxh7+', saidHabits: said,
    }));
    expect(second).toBeTruthy();
    expect(second).toMatch(/check|captur|forcing/i);
  });

  it('without a ledger nothing is suppressed (a surface opts in)', () => {
    const a = methodBeatFor(base({ ignoredThreat: true }));
    const b = methodBeatFor(base({ ignoredThreat: true }));
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
  });

  it('method is still taught only to the mover', () => {
    expect(methodBeatFor(base({ isStudentMove: false, ignoredThreat: true }))).toBeNull();
  });
});
