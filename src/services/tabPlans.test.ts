import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { tabPlanIds, tabiaPlanOf, tabHasPlans, tabiaPlanShown, tabiaStructureShown } from './tabPlans';
import plansJson from '../data/middlegame-plans.json';
import type { MiddlegamePlan } from '../types';

const plans = plansJson as MiddlegamePlan[];
const fenOf = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const plan = (id: string, openingId: string, fen: string): MiddlegamePlan => ({
  id, openingId, criticalPositionFen: fen, title: id, overview: '', pawnBreaks: [], pieceManeuvers: [], strategicThemes: [], endgameTransitions: [],
});

describe('tabPlans — the one resolver chain the page and the measure read', () => {
  it('resolves a curated tab from its table, an uncurated variation to its own plan id, an uncurated main line to every plan', () => {
    expect(tabPlanIds('ruy-lopez', null)).toBeDefined();
    expect(tabPlanIds('no-such-opening', { label: 'Some Line', name: 'Some Line' })).toEqual(['mp-nosuchopening-some line']);
    expect(tabPlanIds('no-such-opening', null)).toBeUndefined();
  });

  it('the tabia\'s hand-written plan is the one anchored where the line ends; uncurated, only an anchor counts', () => {
    const end = fenOf(['e4', 'e5']);
    const anchored = plan('mp-x-a', 'x', end);
    const elsewhere = plan('mp-x-b', 'x', fenOf(['d4']));
    const ending = plan('mp-x-end-endgame', 'x', end);
    expect(tabiaPlanOf([elsewhere, anchored], 'x', undefined, end)).toBe(anchored);
    expect(tabiaPlanOf([elsewhere], 'x', undefined, end)).toBeNull();
    // A curated tab falls back to its first plan; an endgame plan never.
    expect(tabiaPlanOf([elsewhere], 'x', ['mp-x-b'], end)).toBe(elsewhere);
    expect(tabiaPlanOf([ending], 'x', ['mp-x-end-endgame'], end)).toBeNull();
    expect(tabHasPlans([ending], 'x', ['mp-x-end-endgame'])).toBe(true);
    expect(tabHasPlans([], 'x', undefined)).toBe(false);
  });

  it('reads the real plans file (non-vacuous)', () => {
    const ruyMain = tabPlanIds('ruy-lopez', null) ?? [];
    expect(tabHasPlans(plans, 'ruy-lopez', ruyMain.length ? ruyMain : undefined)).toBe(true);
  });
});

describe('the tabia card (2026-10-29: a middlegame plan the games played on every tab they reach)', () => {
  const computed = plan('computed-x--1', 'x', fenOf(['e4', 'e5']));
  const hand = plan('mp-x-a', 'x', fenOf(['e4', 'e5']));

  it('shows the hand-written plan anchored at the tabia, else the plan the games played — even on a tab whose hand-written plans sit elsewhere', () => {
    expect(tabiaPlanShown(hand, computed)).toBe(hand);
    expect(tabiaPlanShown(null, computed)).toBe(computed);
    expect(tabiaPlanShown(null, null)).toBeNull();
  });

  it('with no plan, shows the line\'s own end only when it is a middlegame board — never an opening board\'s structure', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3: nobody has castled.
    expect(tabiaStructureShown(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'])).toBe(false);
    // One side castled is still the opening.
    expect(tabiaStructureShown(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6'])).toBe(false);
    expect(tabiaStructureShown(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O'])).toBe(true);
    // An exchange half-played is not a position to read a structure from:
    // the pawn on d4 is about to be taken back, not "your passed pawn".
    expect(tabiaStructureShown(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O', 'd4', 'exd4'])).toBe(false);
  });
});
