// THE DECIDER'S WEIGHTS, LEARNED FROM HIS GAMES (2026-11-05). A kind his
// positions measured is ranked by his rate; a kind they did not measure keeps
// its lane's number — never a teaching move's rate in its place.
import { describe, it, expect } from 'vitest';
import WEIGHTS from '../data/decider-weights.json';
import { learnedRate, learnedLead, learnedOutOfPhase, LEAD_FLOOR, LEAD_CEIL } from './deciderWeights';
import type { CoachFactKind } from './coachFact';

const KINDS = (WEIGHTS as { kindWeights: Record<string, Record<string, number>> }).kindWeights;

describe('the learned weights', () => {
  it('the table holds kinds measured on his positions, with the full games held out', () => {
    const w = WEIGHTS as { trainPositions: number; heldOutVideos: number };
    expect(w.trainPositions).toBeGreaterThan(1000);
    expect(w.heldOutVideos).toBeGreaterThan(40);
    expect(Object.keys(KINDS['*']).length).toBeGreaterThan(10);
  });

  it('a measured kind is read for its own moment; an unmeasured kind is null (its lane keeps its number)', () => {
    const plan = learnedRate('plan-arc', { seat: 'own', phase: 'middlegame' });
    expect(plan).toBe(KINDS['own|middlegame']['plan-arc']);
    // 'passer' is a kind neither the lesson rows nor the Learn replays offered: no proxy stands in.
    expect(KINDS['*'].passer).toBeUndefined();
    expect(learnedRate('passer', { seat: 'own', phase: 'middlegame' })).toBeNull();
  });

  it('his order: a plan outranks a generic fundamental rule when neither carries stakes', () => {
    const m = { seat: 'own' as const, phase: 'middlegame' as const };
    const plan = learnedRate('plan-arc', m);
    const rule = learnedRate('fundamental', m);
    expect(plan).not.toBeNull();
    expect(rule).not.toBeNull();
    expect(learnedLead(plan as number)).toBeGreaterThan(learnedLead(rule as number));
  });

  it('Learn\'s own kinds are measured from the Learn replays, and those games leave the test set', () => {
    const w = WEIGHTS as { tunedOnReplays: string[] };
    expect(w.tunedOnReplays.length).toBeGreaterThan(0);
    // what they are going for — he asks it all the time; a bare rule of thumb he almost never says
    const m = { seat: 'own' as const, phase: 'middlegame' as const };
    expect(learnedRate('opponent-intent', m)).not.toBeNull();
    expect(learnedLead(learnedRate('opponent-intent', m) as number)).toBeGreaterThan(learnedLead(learnedRate('rule', m) as number));
  });

  it('a kind measured only over every moment keeps its lane\'s phase rule', () => {
    // 'point' is measured from the replays, over all moments only
    expect(KINDS['own|endgame']?.point).toBeUndefined();
    expect(learnedRate('point', { seat: 'own', phase: 'endgame' })).not.toBeNull();
    expect(learnedOutOfPhase('point', { seat: 'own', phase: 'endgame' })).toBeNull();
  });

  it('a lead sits on the door\'s scale', () => {
    expect(learnedLead(0)).toBe(LEAD_FLOOR);
    expect(learnedLead(1)).toBe(LEAD_CEIL);
  });

  it('out of phase only where measured: an unmeasured kind defers to its lane\'s phase rule', () => {
    expect(learnedOutOfPhase('passer' as CoachFactKind, { seat: 'own', phase: 'endgame' })).toBeNull();
    expect(typeof learnedOutOfPhase('plan-arc', { seat: 'own', phase: 'endgame' })).toBe('boolean');
  });
});
