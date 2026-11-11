// Middlegame-Plan ID Integrity Gate (2026-07-16).
//
// Catches the failure mode where the tab-plan table references a plan id
// that doesn't exist in middlegame-plans.json. The runtime consumption is a
// graceful filter (MiddlegamePlansSection drops unknown ids), so a dangling
// id never crashes — it silently renders an EMPTY middlegame-plans zone on
// that variation tab. The coverage gate (proRepTabPlanCoverage) can't see it
// because the table still returns a non-null array.
//
// Found 2026-07-16: 39 dangling ids across 20 resolver files — resolvers
// authored optimistically for plans that were never written (git history
// confirms none of the ids ever existed in middlegame-plans.json). Five were
// fixed same-day (grunfeld repoint, 2 pro plans authored, 2 stale ids
// pruned); the rest are the masterclass variation-plan authoring backlog
// below.
//
// Contract: every plan id in the tab-plan table (src/data/tabPlans.ts — its
// rows and its families) must exist in middlegame-plans.json, OR sit in the
// shrink-only baseline. It reads the table itself, never file names: when the
// 84 per-opening resolver files were folded into one table (WO-OPENINGS-
// REWRITE-01 R2), a file-name scan would have read nothing and passed. When you
// AUTHOR one of the baselined plans, remove its id here — the baseline only
// ever shrinks. Adding a NEW dangling id fails the build.

import { describe, it, expect } from 'vitest';
import middlegamePlans from './middlegame-plans.json' assert { type: 'json' };
import { TAB_PLAN_TABLE, TAB_PLAN_FAMILIES, type TabPlanRow } from './tabPlans';

// Never-authored masterclass variation plans (the authoring backlog).
// Shrink-only: remove an id when its plan lands in middlegame-plans.json.
const BASELINE_MISSING = new Set<string>([
  // EMPTY (2026-07-16): all 34 originally-missing plans authored. The last 3
  // (albin-fianchetto, oldindian-czech, oldindian-be2) required rebuilding
  // their VARIATION lines first — the old lines evaluated -1.2 to -1.62 for
  // the student (over the soundness bar); the data-spine rebuilds
  // (build-opening-spine walks) all screen sound (-0.22 to -0.51 @25s).
  // Keep this baseline at ZERO: a new dangling id is a build failure.
]);

interface PlanRecord {
  id: string;
}

const PLAN_IDS = new Set((middlegamePlans as PlanRecord[]).map((p) => p.id));

/** Every (row, plan id) pair the tab-plan table names. */
function tablePlanIds(): Array<{ row: string; id: string }> {
  const rows: Array<[string, TabPlanRow]> = [
    ...Object.entries(TAB_PLAN_TABLE),
    ...TAB_PLAN_FAMILIES.map((f): [string, TabPlanRow] => [`${f.prefix}*`, f.row]),
  ];
  return rows.flatMap(([row, r]) => [
    ...Object.values(r.tabs).flat(),
    ...(r.containing ?? []).flatMap((c) => c.ids),
    ...(r.otherTabs ?? []),
  ].map((id) => ({ row, id })));
}

describe('middlegame-plan id integrity — every tab-plan table id exists (or is baselined)', () => {
  it('the table references no plan id missing from middlegame-plans.json', () => {
    const named = tablePlanIds();
    // Non-vacuous: the table is read (459 distinct ids on 2026-11-11).
    expect(new Set(named.map((n) => n.id)).size).toBeGreaterThan(400);
    const violations = named
      .filter(({ id }) => !PLAN_IDS.has(id) && !BASELINE_MISSING.has(id))
      .map(({ row, id }) => `${row}: ${id}`);
    expect(violations).toEqual([]);
  });

  it('baseline only shrinks — every baselined id is still referenced somewhere and still missing', () => {
    const referenced = new Set(tablePlanIds().map((n) => n.id));
    const stale: string[] = [];
    for (const id of BASELINE_MISSING) {
      if (PLAN_IDS.has(id)) {
        stale.push(`${id} — plan now exists, remove from BASELINE_MISSING`);
      } else if (!referenced.has(id)) {
        stale.push(`${id} — the table no longer references it, remove from BASELINE_MISSING`);
      }
    }
    expect(stale).toEqual([]);
  });
});
