// Tab → middlegame-plan map for the Evans Gambit masterclass. Hand-picked (no
// algo). Keys: 'main' (the Accepted pill) + the 3 variation tab labels, lower-
// cased (must match variationTabs.ts CURATED['evans-gambit']).

export const EVANS_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-evansgambit-main'],
  declined: ['mp-evansgambit-declined'],
  compromised: ['mp-evansgambit-compromised'],
  lasker: ['mp-evansgambit-lasker'],
};

/** The hand-picked middlegame plan ids for an Evans tab, or null when the
 *  opening isn't the Evans Gambit. `tabKey` is 'main' for the main-line tab,
 *  else the lower-cased tab label. */
export function getEvansTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'evans-gambit') return null;
  return EVANS_TAB_PLAN_IDS[tabKey] ?? null;
}
