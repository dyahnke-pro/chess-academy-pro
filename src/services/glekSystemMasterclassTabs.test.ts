import { describe, it, expect } from 'vitest';
import { getGlekSystemTabPlanIds } from './glekSystemMasterclassTabs';
import { OPENING_ID_ALIASES } from './openingService';
import repertoire from '../data/repertoire.json';
import manifests from '../data/opening-manifests.json';
import middlegamePlans from '../data/middlegame-plans.json';
import { buildVariationTabs } from './variationTabs';

// The Glek System was promoted from a Four Knights tab to a standalone
// masterclass (David 2026-07-03). This gate guards the wiring so a future
// change can't quietly break the standalone course back into a bare page.
const GLEK = 'glek-system';

describe('Glek System masterclass wiring', () => {
  it('has a repertoire.json masterclass entry (isRepertoire course)', () => {
    const entry = (repertoire as Array<{ id: string; color: string; variations?: unknown[] }>).find((o) => o.id === GLEK);
    expect(entry, 'glek-system missing from repertoire.json').toBeTruthy();
    expect(entry?.color).toBe('white');
    expect((entry?.variations ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('is declared a masterclass in opening-manifests.json', () => {
    expect((manifests as Record<string, unknown>)[GLEK]).toBeTruthy();
  });

  it('the bare Lichess ECO twin aliases to the masterclass', () => {
    expect(OPENING_ID_ALIASES['c47-four-knights-game-glek-system']).toBe(GLEK);
  });

  it('has curated variation tabs matching its variations', () => {
    const entry = (repertoire as Array<{ id: string; variations?: Array<{ name: string; pgn: string }> }>).find((o) => o.id === GLEK);
    const tabs = buildVariationTabs(GLEK, (entry?.variations ?? []) as never);
    expect(tabs.length).toBeGreaterThanOrEqual(3);
  });

  it('tab plan ids resolve to real middlegame plans', () => {
    const planIds = new Set((middlegamePlans as Array<{ id: string }>).map((p) => p.id));
    const mainPlans = getGlekSystemTabPlanIds(GLEK, 'main');
    expect(mainPlans && mainPlans.length).toBeGreaterThan(0);
    for (const id of mainPlans ?? []) expect(planIds.has(id), `missing plan ${id}`).toBe(true);
    const d5Plans = getGlekSystemTabPlanIds(GLEK, 'central 4...d5');
    for (const id of d5Plans ?? []) expect(planIds.has(id), `missing plan ${id}`).toBe(true);
  });

  it('returns null for a non-Glek opening', () => {
    expect(getGlekSystemTabPlanIds('four-knights-game', 'main')).toBeNull();
  });
});
