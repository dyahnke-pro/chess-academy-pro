// Gate: an '-endgame' plan renders only when its opening's tab resolver
// lists it (EndgamePlansSection filters by the tab's plan ids). Sixteen
// endgame plans once shipped that no resolver named, so no page ever showed
// them. An opening with no resolver falls back to showing all its plans, so
// the rule is: if a tab resolver claims the opening, it must name the plan.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import plansRaw from './middlegame-plans.json';

const SERVICES = 'src/services';
const resolverText = readdirSync(SERVICES)
  .filter((f) => /Tab(s|Plans)\.ts$/.test(f) && !f.endsWith('.test.ts'))
  .map((f) => readFileSync(`${SERVICES}/${f}`, 'utf8'))
  .join('\n');

describe('every endgame plan is reachable from a tab', () => {
  it('each -endgame plan id is named by a tab resolver', () => {
    const unreached = (plansRaw as Array<{ id: string; openingId: string }>)
      .filter((p) => p.id.endsWith('-endgame'))
      .filter((p) => resolverText.includes(`'${p.openingId}'`) && !resolverText.includes(`'${p.id}'`))
      .map((p) => p.id);
    expect(unreached).toEqual([]);
  });
  it('reads the resolvers (non-vacuous)', () => {
    expect(resolverText).toContain('getCaroKannTabPlanIds');
    expect(resolverText).toContain("'benko-gambit'");
  });
});
