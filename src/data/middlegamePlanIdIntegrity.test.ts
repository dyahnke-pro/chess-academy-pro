// Middlegame-Plan ID Integrity Gate (2026-07-16).
//
// Catches the failure mode where a tab-plan resolver references a plan id
// that doesn't exist in middlegame-plans.json. The runtime consumption is a
// graceful filter (MiddlegamePlansSection drops unknown ids), so a dangling
// id never crashes — it silently renders an EMPTY middlegame-plans zone on
// that variation tab. The coverage gate (proRepTabPlanCoverage) can't see it
// because the resolver still returns a non-null array.
//
// Found 2026-07-16: 39 dangling ids across 20 resolver files — resolvers
// authored optimistically for plans that were never written (git history
// confirms none of the ids ever existed in middlegame-plans.json). Five were
// fixed same-day (grunfeld repoint, 2 pro plans authored, 2 stale ids
// pruned); the rest are the masterclass variation-plan authoring backlog
// below.
//
// Contract: every 'mp-*' literal in a tab-resolver service file must exist
// in middlegame-plans.json, OR sit in the shrink-only baseline. When you
// AUTHOR one of the baselined plans, remove its id here — the baseline only
// ever shrinks. Adding a NEW dangling id fails the build.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import middlegamePlans from './middlegame-plans.json' assert { type: 'json' };

const SERVICES_DIR = join(__dirname, '..', 'services');

// Never-authored masterclass variation plans (the authoring backlog).
// Shrink-only: remove an id when its plan lands in middlegame-plans.json.
const BASELINE_MISSING = new Set<string>([
  'mp-albincountergambit-fianchetto',
  'mp-albincountergambit-lasker',
  'mp-albincountergambit-spassky',
  'mp-benonidefence-fourpawns',
  'mp-budapestgambit-adler',
  'mp-budapestgambit-fajarowicz',
  'mp-kingsindiandefence-bayonet',
  'mp-kingsindiandefence-fourpawns',
  'mp-oldindiandefence-be2',
  'mp-oldindiandefence-czech',
  'mp-qga-janowski',
  'mp-qga-sadler',
  'mp-queensindian-bb4',
  'mp-queensindian-petrosian',
  'mp-schliemanndefence-dyckhoff',
  'mp-schliemanndefence-exf5',
  'mp-schliemanndefence-schonemann',
  'mp-twoknightsdefence-d4',
  'mp-twoknightsdefence-maxlange',
]);

interface PlanRecord {
  id: string;
}

const PLAN_IDS = new Set((middlegamePlans as PlanRecord[]).map((p) => p.id));

function resolverFiles(): string[] {
  return readdirSync(SERVICES_DIR).filter(
    (f) =>
      (f.endsWith('TabPlans.ts') || f.endsWith('MasterclassTabs.ts') || f.endsWith('masterclassTabs.ts')) &&
      !f.endsWith('.test.ts'),
  );
}

function planIdLiterals(source: string): string[] {
  const ids: string[] = [];
  const re = /'(mp-[A-Za-z0-9-]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) ids.push(m[1]);
  return ids;
}

describe('middlegame-plan id integrity — every resolver id exists (or is baselined)', () => {
  it('no resolver references a plan id missing from middlegame-plans.json', () => {
    const violations: string[] = [];
    for (const file of resolverFiles()) {
      const source = readFileSync(join(SERVICES_DIR, file), 'utf8');
      for (const id of planIdLiterals(source)) {
        if (!PLAN_IDS.has(id) && !BASELINE_MISSING.has(id)) {
          violations.push(`${file}: ${id}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('baseline only shrinks — every baselined id is still referenced somewhere and still missing', () => {
    const referenced = new Set<string>();
    for (const file of resolverFiles()) {
      for (const id of planIdLiterals(readFileSync(join(SERVICES_DIR, file), 'utf8'))) {
        referenced.add(id);
      }
    }
    const stale: string[] = [];
    for (const id of BASELINE_MISSING) {
      if (PLAN_IDS.has(id)) {
        stale.push(`${id} — plan now exists, remove from BASELINE_MISSING`);
      } else if (!referenced.has(id)) {
        stale.push(`${id} — no resolver references it anymore, remove from BASELINE_MISSING`);
      }
    }
    expect(stale).toEqual([]);
  });
});
