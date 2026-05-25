// Tab → middlegame-plan map for the London System masterclass. Hand-picked
// (no algo). Keys: 'main' (the London vs ...d5 pill) + the 4 variation tab
// labels, lower-cased (must match variationTabs.ts CURATED['london-system']).

export const LONDON_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-londonsystem-main'],
  'vs kid': ['mp-londonsystem-kid'],
  jobava: ['mp-londonsystem-jobava'],
};

/** The hand-picked middlegame plan ids for a London tab, or null when the
 *  opening isn't the London System. `tabKey` is 'main' for the main-line tab,
 *  else the lower-cased tab label. */
export function getLondonTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'london-system') return null;
  return LONDON_TAB_PLAN_IDS[tabKey] ?? null;
}
