import { describe, expect, it } from 'vitest';
import { OPENING_PRODUCTS, openingProductFor, openingsOwnedBy } from './openingProducts';
import { FREE_OPENING_POOL, isEligibleFreeOpening } from './freeTierService';
import antiOpenings from '../data/anti-openings.json';

/** Everything for sale: the free-pick pool plus the Counter-Weapons tab. */
const COUNTER_IDS = (antiOpenings as Array<{ id: string }>).map((o) => o.id);
const SOLD = new Set([...FREE_OPENING_POOL, ...COUNTER_IDS]);

describe('opening products — the one list of openings sold à la carte', () => {
  it('is the free-pick pool plus every counter-weapon (rebuild with scripts/build-opening-products.mjs)', () => {
    const listed = new Set(OPENING_PRODUCTS.map((p) => p.openingId));
    expect([...SOLD].filter((id) => !listed.has(id))).toEqual([]);
    expect([...listed].filter((id) => !SOLD.has(id))).toEqual([]);
    expect(OPENING_PRODUCTS.length).toBe(listed.size);
    expect(COUNTER_IDS.length).toBeGreaterThan(0);
  });

  it('a counter-weapon is for sale but never the free pick (David 2026-10-25: "Keep them locked behind the sale price")', () => {
    for (const id of COUNTER_IDS) {
      expect(openingProductFor(id)?.kind, id).toBe('counter');
      expect(isEligibleFreeOpening(id), id).toBe(false);
    }
  });

  it('every product id is unique and one App Store Connect accepts', () => {
    const ids = OPENING_PRODUCTS.map((p) => p.productId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^opening\.[a-z0-9_]+$/);
      expect(id.length).toBeLessThanOrEqual(100);
    }
  });

  it('every store name and description fits Apple\'s limits', () => {
    for (const p of OPENING_PRODUCTS) {
      expect(p.name.length, p.openingId).toBeGreaterThan(0);
      expect(p.name.length, p.openingId).toBeLessThanOrEqual(30);
      expect(p.description.length, p.openingId).toBeLessThanOrEqual(45);
    }
  });

  it('maps a purchase back to its opening and ignores the subscription', () => {
    const ruy = openingProductFor('ruy-lopez');
    expect(ruy?.productId).toBe('opening.ruy_lopez');
    expect(openingsOwnedBy(['opening.ruy_lopez', 'chess_academy_pro_monthly', 'opening.ruy_lopez'])).toEqual(['ruy-lopez']);
    expect(openingsOwnedBy([])).toEqual([]);
    expect(openingProductFor('not-an-opening')).toBeNull();
  });
});
