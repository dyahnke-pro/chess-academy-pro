// Tab → middlegame-plan map for the Réti masterclass. Hand-picked (no algo).
// Keys: 'main' (the Nimzo-English Hybrid pill) + the variation tab label,
// lower-cased (must match variationTabs.ts CURATED['reti-opening']).

export const RETI_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-retiopening-main'],
  'anti-slav': ['mp-retiopening-antislav'],
};

/** The hand-picked middlegame plan ids for a Réti tab, or null when the
 *  opening isn't the Réti. `tabKey` is 'main' for the main-line tab, else the
 *  lower-cased tab label. */
export function getRetiTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'reti-opening') return null;
  return RETI_TAB_PLAN_IDS[tabKey] ?? null;
}
