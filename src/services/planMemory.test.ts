// planMemory — a plan is announced ONCE and carried until the structure changes
// (unified-coach N3, plan §3.6).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { stepPlan, foldPlans, EMPTY_PLAN_STATE, planProgressText } from './planMemory';

describe('stepPlan', () => {
  it('announces the first plan, carries the same plan, marks a different one as changed', () => {
    const a = stepPlan(EMPTY_PLAN_STATE, 10, 'push the passed pawn');
    expect(a.event).toBe('announce');
    expect(a.next).toEqual({ plan: 'push the passed pawn', announcedAt: 10 });
    const b = stepPlan(a.next, 12, 'push the passed pawn');
    expect(b.event).toBe('carry');
    expect(b.next).toBe(a.next);
    const c = stepPlan(b.next, 14, 'blockade the isolated pawn');
    expect(c.event).toBe('changed');
    expect(c.next.announcedAt).toBe(14);
  });
  it('a ply with no plan leaves the state untouched (none)', () => {
    const a = stepPlan({ plan: 'x', announcedAt: 3 }, 5, null);
    expect(a.event).toBe('none');
    expect(a.next).toEqual({ plan: 'x', announcedAt: 3 });
  });
});

describe('foldPlans over a sequence', () => {
  // A passed-pawn structure held across several quiet plies: White has a passed
  // d-pawn; the plan must be announced once, then carried.
  const START = '4k3/pp3ppp/8/3P4/8/8/PP3PPP/4K3 w - - 0 1';
  function seq(sans: string[]): Array<{ ply: number; fenAfter: string; playerColor: 'white' | 'black' }> {
    const c = new Chess(START);
    return sans.map((san, i) => {
      const mv = c.move(san);
      if (!mv) throw new Error(`bad san ${san}`);
      return { ply: i + 1, fenAfter: c.fen(), playerColor: mv.color === 'w' ? 'white' : 'black' };
    });
  }
  it('announces once on the student ply, carries on the next student ply, never on the opponent ply', () => {
    const plies = seq(['Kd2', 'Kd7', 'Kd3', 'Kd6', 'Kd4']);
    const m = foldPlans(plies, 'white');
    const events = plies.map((p) => m.get(p.ply)!.event);
    expect(events[0]).toBe('announce');
    expect(events[1]).toBe('none');            // opponent ply carries state silently
    expect(events[2]).toBe('carry');
    expect(events.filter((e) => e === 'announce')).toHaveLength(1);
    expect(m.get(1)!.plan).toMatch(/pass/i);
  });
  it('progress text exists only while a plan is in force', () => {
    expect(planProgressText(EMPTY_PLAN_STATE)).toBe('');
    expect(planProgressText({ plan: 'x', announcedAt: 1 })).toMatch(/Same plan/);
  });
});
