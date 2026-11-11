// Gate: an '-endgame' plan renders only when its opening's tab-plan row lists
// it (EndgamePlansSection filters by the tab's plan ids). Sixteen endgame plans
// once shipped that no resolver named, so no page ever showed them. An opening
// with no row falls back to showing all its plans, so the rule is: if the
// tab-plan table claims the opening, its row must name the plan.
import { describe, expect, it } from 'vitest';
import plansRaw from './middlegame-plans.json';
import { TAB_PLAN_TABLE } from './tabPlans';

/** Every plan id an opening's row names, on any tab. */
function rowPlanIds(openingId: string): Set<string> | null {
  const row = Object.hasOwn(TAB_PLAN_TABLE, openingId) ? TAB_PLAN_TABLE[openingId] : undefined;
  if (!row) return null;
  return new Set([
    ...Object.values(row.tabs).flat(),
    ...(row.containing ?? []).flatMap((c) => c.ids),
    ...(row.otherTabs ?? []),
  ]);
}

describe('every endgame plan is reachable from a tab', () => {
  it('each -endgame plan id is named by its opening\'s tab-plan row', () => {
    const unreached = (plansRaw as Array<{ id: string; openingId: string }>)
      .filter((p) => p.id.endsWith('-endgame'))
      .filter((p) => {
        const named = rowPlanIds(p.openingId);
        return named !== null && !named.has(p.id);
      })
      .map((p) => p.id);
    expect(unreached).toEqual([]);
  });
  it('reads the table (non-vacuous)', () => {
    expect(rowPlanIds('caro-kann')?.has('mp-carokann-main-endgame')).toBe(true);
    expect(rowPlanIds('benko-gambit')?.has('mp-benkogambit-endgame')).toBe(true);
    const claimed = (plansRaw as Array<{ id: string; openingId: string }>)
      .filter((p) => p.id.endsWith('-endgame') && rowPlanIds(p.openingId) !== null);
    expect(claimed.length).toBeGreaterThan(50);
  });
});
