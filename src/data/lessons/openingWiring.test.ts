import { describe, it, expect } from 'vitest';
import { ALL_LESSONS, FIRST_CLASS_OPENING_IDS } from './registry';
import { buildVariationTabs } from '../../services/variationTabs';

// Wiring-readiness gate (David 2026-05-24: "make autonomous creation a thing").
// A new masterclass opening can be REGISTERED (a main lesson in registry.ts)
// without its surrounding wiring — so the detail page renders half-built. The
// manifest gate already forces a content-floor entry; this forces the TAB
// wiring: every first-class opening must (a) have variation lessons authored,
// and (b) actually produce ≥1 variation tab through buildVariationTabs (via a
// CURATED entry or the show-all fallback). It also catches dead/typo CURATED
// rows by proving the produced tabs are well-formed.
//
// NOT gated here: which plans a tab owns. When you add an opening with per-tab
// plans, add the opening's row to the tab-plan table (`src/data/tabPlans.ts`)
// — see playbook §0.7 STEP 4; `tabPlans.snapshot.test.ts` records every tab's
// answer. An opening with no row falls back (a variation → its own
// `mp-<id>-<tab>` plan, the main line → every plan of the opening), so a
// missing row degrades gracefully.

describe('opening wiring-readiness — registered openings produce variation tabs', () => {
  for (const oid of FIRST_CLASS_OPENING_IDS) {
    const variationNames = ALL_LESSONS
      .filter((l) => l.openingId === oid && l.scope === 'variation')
      .map((l) => l.key.split('::')[1])
      .filter((n): n is string => Boolean(n));

    it(`${oid}: has variation lessons authored`, () => {
      expect(
        variationNames.length,
        `${oid} is registered but has no variation lessons — a masterclass needs tabbed variations`,
      ).toBeGreaterThan(0);
    });

    it(`${oid}: produces ≥1 variation tab (CURATED or fallback) with valid labels`, () => {
      const variations = variationNames.map((name) => ({ name })) as Parameters<typeof buildVariationTabs>[1];
      const tabs = buildVariationTabs(oid, variations);
      expect(tabs.length, `${oid} produces no variation tabs — check CURATED / variation names`).toBeGreaterThan(0);
      for (const t of tabs) {
        expect(t.label.trim().length, `${oid} has an empty tab label`).toBeGreaterThan(0);
        expect(t.index, `${oid} tab index out of range`).toBeGreaterThanOrEqual(0);
        expect(t.index).toBeLessThan(variations?.length ?? 0);
      }
    });
  }
});
