// Tab → middlegame-plan map for the King's Indian Attack masterclass. Hand-
// picked (no algo). Keys: 'main' (the vs-French e5-wedge pill) + the variation
// tab label, lower-cased (must match variationTabs.ts CURATED['kings-indian-attack']).

export const KIA_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-kingsindianattack-main'],
  'kid-style': ['mp-kingsindianattack-kid'],
};

/** The hand-picked middlegame plan ids for a KIA tab, or null when the opening
 *  isn't the KIA. `tabKey` is 'main' for the main-line tab, else the lower-
 *  cased tab label. */
export function getKiaTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'kings-indian-attack') return null;
  return KIA_TAB_PLAN_IDS[tabKey] ?? null;
}
