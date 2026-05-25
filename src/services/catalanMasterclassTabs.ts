// Tab → middlegame-plan map for the Catalan masterclass. Hand-picked (no algo).
// Keys: 'main' (the Open Catalan pill) + the 2 variation tab labels, lower-
// cased (must match variationTabs.ts CURATED['catalan-opening']).

export const CATALAN_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-catalanopening-main'],
  closed: ['mp-catalanopening-closed'],
  'vs slav': ['mp-catalanopening-slav'],
};

/** The hand-picked middlegame plan ids for a Catalan tab, or null when the
 *  opening isn't the Catalan. `tabKey` is 'main' for the main-line tab, else
 *  the lower-cased tab label. */
export function getCatalanTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'catalan-opening') return null;
  return CATALAN_TAB_PLAN_IDS[tabKey] ?? null;
}
