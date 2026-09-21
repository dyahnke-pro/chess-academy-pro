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
  tier: 'consequence' as const, cpLossCp: 50, bestSan: 'Nxe5', ignoredThreat: false,
  isStudentMove: true, ...o,
});

describe('method beat — need-scaled bar', () => {
  it('a 50cp slip earns NO forcing beat for a student with no such hole', () => {
    expect(methodBeatFor(base())).toBeNull();
  });

  it('the SAME slip earns it when their own record says they miss forcing shots', () => {
    const beat = methodBeatFor(base({ habitNeed: { 'forcing-scan': 'open' } }));
    expect(beat).toBeTruthy();
    expect(beat).toMatch(/check|captur|forcing/i);
  });

  it('a big slip still earns it with no need data (cold start is never mute)', () => {
    expect(methodBeatFor(base({ cpLossCp: 250 }))).toBeTruthy();
  });

  it('slow-down widens to blunder/swing only when that is their hole', () => {
    expect(methodBeatFor(base({ tier: 'blunder', bestSan: 'Nf3', cpLossCp: 300 }))).toBeNull();
    const beat = methodBeatFor(base({
      tier: 'blunder', bestSan: 'Nf3', cpLossCp: 300, habitNeed: { 'slow-down': 'open' },
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

// ── "IF THEY MAKE THE CORRECT MOVE THIS PHRASE SHOULDN'T FIRE" ───────────────
// David 2026-09-16, reading the opponent-threat beat. He was right about that
// one — `attributePrinciples` returns [] on an unflagged move, so `ignoredThreat`
// cannot be true when the student played well. SLOW-DOWN had no such guard: it
// gated on the MOMENT's tier alone, so finding the only move in a critical
// position still earned "this was the moment to slow down".
describe('a method beat needs something to correct', () => {
  it('stays SILENT on a critical moment the student got right', () => {
    const beat = methodBeatFor(base({ tier: 'critical', cpLossCp: 0, bestSan: 'Nf3' }));
    expect(beat).toBeNull();
  });

  it('still teaches when they got it right-ish but really did drop something', () => {
    expect(methodBeatFor(base({ tier: 'critical', cpLossCp: 120, bestSan: 'Nf3' }))).toMatch(/slow down|clock|thinking time/i);
  });

  // THE OVERRIDE, BOTH DIRECTIONS (David 2026-09-16: "If the user finds the
  // correct move more often than not maybe it can stay quiet. But a more
  // complicated position similar to where the user has misstepped before would
  // warrant the warning"). Evidence of the hole is what buys the warning on a
  // move they played WELL — and the absence of evidence must never buy it,
  // which is why the override reads `=== 'open'` and not `habitIsOwed` (that
  // helper treats unknown as owed, correctly, for a different question).
  it('warns on a move played WELL when their record says they misstep here', () => {
    const beat = methodBeatFor(base({
      tier: 'critical', cpLossCp: 0, bestSan: 'Nf3', habitNeed: { 'slow-down': 'open' },
    }));
    expect(beat).toMatch(/slow down|clock|thinking time/i);
  });

  it('a student whose slow-down hole is CLOSED is not warned on a move played well', () => {
    expect(methodBeatFor(base({
      tier: 'critical', cpLossCp: 0, bestSan: 'Nf3', habitNeed: { 'slow-down': 'closed' },
    }))).toBeNull();
  });

  it('an UNKNOWN cost does not mute it — null is not zero', () => {
    // An ungraded ply has no cpLoss. Absent data never mutes the coach.
    expect(methodBeatFor(base({ tier: 'critical', cpLossCp: null, bestSan: 'Nf3' }))).toBeTruthy();
  });

  it('the opponent-threat beat is unreachable on a good move by construction', () => {
    // `ignoredThreat` comes from the attributor, which is flagged-only — this
    // pins the CONTRACT so a future caller cannot start passing it on good moves.
    expect(methodBeatFor(base({ ignoredThreat: false, cpLossCp: 0, bestSan: 'Nf3', tier: 'consequence' as const }))).toBeNull();
  });
});

// ── ONLY-MOVE IS THE ONE THAT FIRES EITHER WAY ───────────────────────────────
// David 2026-09-16: "The slow down beat can fire at a critical moment. When
// there is only one move that holds equality." Recognising that shape IS the
// skill, so it is taught to the student who found it as much as to the one who
// did not — but never in the scolding register.
describe('only-move teaches whether or not they found it', () => {
  it('FIRES when the student found the only move', () => {
    expect(methodBeatFor(base({ tier: 'only-move', cpLossCp: 0, bestSan: 'Nf3' }))).toBeTruthy();
  });

  it('does NOT scold the student who found it', () => {
    const beat = methodBeatFor(base({ tier: 'only-move', cpLossCp: 0, bestSan: 'Nf3' })) ?? '';
    expect(beat).toMatch(/you found it|you solved it|it was the one you played/i);
    // "should have" / "was the moment to" is the miss register — wrong here.
    expect(beat).not.toMatch(/this was the moment to slow down/i);
  });

  it('still uses the corrective register when they missed it', () => {
    const beat = methodBeatFor(base({ tier: 'only-move', cpLossCp: 220, bestSan: 'Nf3' })) ?? '';
    expect(beat).toMatch(/moment to slow down|Spend your clock|fork in the road/i);
    expect(beat).not.toMatch(/you found it|you solved it/i);
  });

  it('a merely CRITICAL moment played well stays silent — only-move is the carve-out', () => {
    expect(methodBeatFor(base({ tier: 'critical', cpLossCp: 0, bestSan: 'Nf3' }))).toBeNull();
  });

  it('say-once still holds across both registers', () => {
    const said = new Set<MethodHabit>();
    // bestSan must be QUIET on both, or the second call lands on the
    // forcing-scan habit (a different, unclaimed one) and this proves nothing.
    const a = methodBeatFor(base({ tier: 'only-move', cpLossCp: 0, bestSan: 'Nf3', saidHabits: said }));
    const b = methodBeatFor(base({ tier: 'only-move', cpLossCp: 220, bestSan: 'Nf3', saidHabits: said }));
    expect(a).toBeTruthy();
    expect(b).toBeNull();
  });
});
