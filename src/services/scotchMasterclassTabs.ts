// Tab → middlegame-plan map for the Scotch Game masterclass. Hand-picked (no
// algo). Keys: 'main' (the Classical pill) + the 4 variation tab labels,
// lower-cased (must match variationTabs.ts CURATED['scotch-game']).

export const SCOTCH_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-scotchgame-main'],
  mieses: ['mp-scotchgame-mieses'],
  'scotch gambit': ['mp-scotchgame-gambit'],
  'four knights': ['mp-scotchgame-fourknights'],
  'kasparov nb3': ['mp-scotchgame-kasparov'],
};

/** The hand-picked middlegame plan ids for a Scotch tab, or null when the
 *  opening isn't the Scotch. `tabKey` is 'main' for the main-line tab, else
 *  the lower-cased tab label. */
export function getScotchTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'scotch-game') return null;
  return SCOTCH_TAB_PLAN_IDS[tabKey] ?? null;
}
