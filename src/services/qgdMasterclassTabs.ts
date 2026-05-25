// Tab → middlegame-plan map for the QGD (Black) masterclass. Hand-picked (no
// algo). Keys: 'main' (the Orthodox pill) + the 7 variation tab labels,
// lower-cased (must match variationTabs.ts CURATED['qgd']).

export const QGD_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-qgd-main'],
  tartakower: ['mp-qgd-tartakower'],
  lasker: ['mp-qgd-lasker'],
  exchange: ['mp-qgd-exchange'],
  ragozin: ['mp-qgd-ragozin'],
  vienna: ['mp-qgd-vienna'],
  'cambridge springs': ['mp-qgd-cambridge'],
  bf4: ['mp-qgd-bf4'],
};

/** The hand-picked middlegame plan ids for a QGD tab, or null when the opening
 *  isn't the QGD. `tabKey` is 'main' for the main-line tab, else the
 *  lower-cased tab label. */
export function getQgdTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'qgd') return null;
  return QGD_TAB_PLAN_IDS[tabKey] ?? null;
}
