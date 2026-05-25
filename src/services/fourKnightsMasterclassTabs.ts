// Tab → middlegame-plan map for the Four Knights Game masterclass. Hand-picked
// (no algo). Keys: 'main' (the Spanish/Metger pill) + the 4 variation tab
// labels, lower-cased (must match variationTabs.ts CURATED['four-knights-game']).

export const FOUR_KNIGHTS_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-fourknightsgame-main'],
  'scotch four knights': ['mp-fourknightsgame-scotchfk'],
  'italian four knights': ['mp-fourknightsgame-italian'],
  'glek system': ['mp-fourknightsgame-glek'],
  rubinstein: ['mp-fourknightsgame-rubinstein'],
};

/** The hand-picked middlegame plan ids for a Four Knights tab, or null when
 *  the opening isn't the Four Knights. `tabKey` is 'main' for the main-line
 *  tab, else the lower-cased tab label. */
export function getFourKnightsTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'four-knights-game') return null;
  return FOUR_KNIGHTS_TAB_PLAN_IDS[tabKey] ?? null;
}
