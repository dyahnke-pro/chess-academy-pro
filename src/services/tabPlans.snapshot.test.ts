// THE TAB-PLAN SNAPSHOT (WO-OPENINGS-REWRITE-01 R2). Every tab of every
// course — the main line, each variation tab as the page names it (its label
// from `buildVariationTabs` and its full variation name), and each variation
// again under its own name and under the empty label the page passes when a
// variation is not a tab — resolved through `tabPlanIds`, compared exactly to
// the answers the per-opening resolver chain gave before it was folded into one
// table. A change to which plans a tab owns shows up here as a diff to review,
// never silently.
//
// Regenerate (only when a tab's plans are meant to change):
//   TAB_PLANS_SNAPSHOT_WRITE=1 npx vitest run src/services/tabPlans.snapshot.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import repertoire from '../data/repertoire.json';
import gambits from '../data/gambits.json';
import proRepertoires from '../data/pro-repertoires.json';
import antiOpenings from '../data/anti-openings.json';
import { buildVariationTabs } from './variationTabs';
import { tabPlanIds, type TabNames } from './tabPlans';
import type { OpeningVariation } from '../types';

interface Course { id: string; variations?: OpeningVariation[] }

const SOURCES: ReadonlyArray<[string, Course[]]> = [
  ['repertoire', repertoire as unknown as Course[]],
  ['gambits', gambits as unknown as Course[]],
  ['pro-repertoires', (proRepertoires as unknown as { openings: Course[] }).openings],
  ['anti-openings', antiOpenings as unknown as Course[]],
];

const FIXTURE = 'src/services/__fixtures__/tabPlans.snapshot.json';

/** Every (opening, tab) the snapshot reads, keyed `<openingId>::<label>::<name>`
 *  (`<openingId>::main` for the main line). */
function snapshotCases(): Array<[string, string, TabNames | null]> {
  const cases: Array<[string, string, TabNames | null]> = [];
  const seen = new Set<string>();
  const add = (openingId: string, tab: TabNames | null): void => {
    const key = tab ? `${openingId}::${tab.label}::${tab.name}` : `${openingId}::main`;
    if (seen.has(key)) return;
    seen.add(key);
    cases.push([key, openingId, tab]);
  };
  for (const [, courses] of SOURCES) {
    for (const course of courses) {
      add(course.id, null);
      const variations = course.variations ?? [];
      for (const tab of buildVariationTabs(course.id, variations)) {
        add(course.id, { label: tab.label, name: variations[tab.index]?.name ?? '' });
      }
      for (const v of variations) {
        add(course.id, { label: v.name, name: v.name });
        add(course.id, { label: '', name: v.name });
      }
    }
  }
  return cases;
}

function liveSnapshot(): Record<string, string[] | null> {
  const out: Record<string, string[] | null> = {};
  for (const [key, openingId, tab] of snapshotCases()) out[key] = tabPlanIds(openingId, tab) ?? null;
  return out;
}

describe('tab plans — every tab of every course resolves exactly as recorded', () => {
  if (process.env.TAB_PLANS_SNAPSHOT_WRITE === '1') {
    it('writes the snapshot', () => {
      writeFileSync(FIXTURE, `${JSON.stringify(liveSnapshot(), null, 1)}\n`);
    });
    return;
  }

  const recorded = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, string[] | null>;

  it('matches the recorded snapshot entry for entry', () => {
    expect(liveSnapshot()).toEqual(recorded);
  });

  it('is non-vacuous: the snapshot covers every course and both kinds of answer', () => {
    const keys = Object.keys(recorded);
    expect(keys.length).toBeGreaterThan(1500);
    for (const [, courses] of SOURCES) {
      for (const course of courses) expect(keys).toContain(`${course.id}::main`);
    }
    const values = Object.values(recorded);
    expect(values.some((v) => v === null)).toBe(true);
    expect(values.some((v) => Array.isArray(v) && v.length === 0)).toBe(true);
    expect(values.some((v) => Array.isArray(v) && v.length > 1)).toBe(true);
  });
});
