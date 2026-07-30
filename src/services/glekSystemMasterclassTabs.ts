// Tab → middlegame-plan map for the Glek System masterclass (David 2026-07-03,
// promoted from a Four Knights tab to a standalone masterclass). Hand-picked.
// Keys: 'main' (the 4...Bc5 pill) + the variation tab labels, lower-cased
// (must match variationTabs.ts CURATED['glek-system'] labels).

export const GLEK_SYSTEM_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-gleksystem-bc5-f5', 'mp-gleksystem-traditional-f4', 'mp-gleksystem-f4trap'],
  'central 4...d5': ['mp-gleksystem-d5-outpost'],
};

/** The hand-picked middlegame plan ids for a Glek System tab, or null when the
 *  opening isn't the Glek System. `tabKey` is 'main' for the main-line tab,
 *  else the lower-cased tab label. */
export function getGlekSystemTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'glek-system') return null;
  return GLEK_SYSTEM_TAB_PLAN_IDS[tabKey] ?? null;
}
