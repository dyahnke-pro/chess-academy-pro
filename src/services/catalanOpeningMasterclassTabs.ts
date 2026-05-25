// Tab → middlegame-plan map for the Catalan (White) masterclass. Hand-picked.
// Keys: 'main' (the Open Catalan main pill) + the 6 variation tab labels,
// lower-cased (must match variationTabs.ts CURATED['catalan-opening']).

export const CATALAN_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-catalan-main'],
  closed: ['mp-catalan-closed'],
  'open a6-b5': ['mp-catalan-opena6'],
  nbd7: ['mp-catalan-nbd7'],
  'vs slav': ['mp-catalan-vsslav'],
  declined: ['mp-catalan-declined'],
  'qa4+': ['mp-catalan-qa4'],
};

export function getCatalanTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'catalan-opening') return null;
  return CATALAN_TAB_PLAN_IDS[tabKey] ?? null;
}
