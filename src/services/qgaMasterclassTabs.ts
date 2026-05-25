// Tab → middlegame-plan map for the QGA (Black) masterclass. Hand-picked.
// Keys: 'main' (the Classical pill) + the 6 variation tab labels, lower-cased
// (must match variationTabs.ts CURATED['qga']).

export const QGA_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-qga-main'],
  smyslov: ['mp-qga-smyslov'],
  sadler: ['mp-qga-sadler'],
  central: ['mp-qga-central'],
  alekhine: ['mp-qga-alekhine'],
  modern: ['mp-qga-modern'],
  janowski: ['mp-qga-janowski'],
};

/** The hand-picked middlegame plan ids for a QGA tab, or null when the opening
 *  isn't the QGA. `tabKey` is 'main' for the main-line tab, else the
 *  lower-cased tab label. */
export function getQgaTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'qga') return null;
  return QGA_TAB_PLAN_IDS[tabKey] ?? null;
}
