// Tab → middlegame-plan map for the Sicilian Dragon masterclass. Hand-picked
// (no algo). Keys: 'main' (the Yugoslav pill) + the variation tab labels,
// lower-cased (must match variationTabs.ts CURATED['sicilian-dragon']).

export const SICILIAN_DRAGON_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-siciliandragon-main'],
  soltis: ['mp-siciliandragon-soltis'],
  'chinese dragon': ['mp-siciliandragon-chinese'],
  classical: ['mp-siciliandragon-classical'],
  levenfish: ['mp-siciliandragon-levenfish'],
  accelerated: ['mp-siciliandragon-accelerated'],
  'anti-dragon bg5': ['mp-siciliandragon-antibg5'],
};

/** The hand-picked middlegame plan ids for a Dragon tab, or null when the
 *  opening isn't the Sicilian Dragon. `tabKey` is 'main' for the main-line
 *  tab, else the lower-cased tab label. */
export function getSicilianDragonTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'sicilian-dragon') return null;
  return SICILIAN_DRAGON_TAB_PLAN_IDS[tabKey] ?? null;
}
