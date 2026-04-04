import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  getPlansForOpening,
  getPlanById,
  getAllPlans,
  storePlans,
  countPlans,
} from './middlegamePlanService';
import { buildMiddlegamePlan } from '../test/factories';

describe('middlegamePlanService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('stores and retrieves plans by opening', async () => {
    const plan1 = buildMiddlegamePlan({ id: 'p1', openingId: 'italian-game' });
    const plan2 = buildMiddlegamePlan({ id: 'p2', openingId: 'italian-game' });
    const plan3 = buildMiddlegamePlan({ id: 'p3', openingId: 'ruy-lopez' });

    await storePlans([plan1, plan2, plan3]);

    const italianPlans = await getPlansForOpening('italian-game');
    expect(italianPlans).toHaveLength(2);

    const ruyPlans = await getPlansForOpening('ruy-lopez');
    expect(ruyPlans).toHaveLength(1);
  });

  it('retrieves a single plan by ID', async () => {
    const plan = buildMiddlegamePlan({ id: 'test-plan', title: 'Central Push' });
    await storePlans([plan]);

    const result = await getPlanById('test-plan');
    expect(result).toBeDefined();
    expect(result?.title).toBe('Central Push');
  });

  it('returns undefined for missing plan', async () => {
    const result = await getPlanById('nonexistent');
    expect(result).toBeUndefined();
  });

  it('returns all plans', async () => {
    await storePlans([
      buildMiddlegamePlan({ id: 'a' }),
      buildMiddlegamePlan({ id: 'b' }),
      buildMiddlegamePlan({ id: 'c' }),
    ]);

    const all = await getAllPlans();
    expect(all).toHaveLength(3);
  });

  it('counts plans for an opening', async () => {
    await storePlans([
      buildMiddlegamePlan({ id: '1', openingId: 'italian-game' }),
      buildMiddlegamePlan({ id: '2', openingId: 'ruy-lopez' }),
    ]);

    expect(await countPlans('italian-game')).toBe(1);
    expect(await countPlans('ruy-lopez')).toBe(1);
    expect(await countPlans('french-defence')).toBe(0);
  });

  it('upserts on duplicate IDs', async () => {
    const original = buildMiddlegamePlan({ id: 'dup', title: 'Plan A' });
    await storePlans([original]);

    const updated = buildMiddlegamePlan({ id: 'dup', title: 'Plan B' });
    await storePlans([updated]);

    const result = await getPlanById('dup');
    expect(result?.title).toBe('Plan B');
  });
});
