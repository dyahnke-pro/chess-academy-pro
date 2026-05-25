// Tab → middlegame-plan map for the Sicilian Alapin masterclass. Keys: 'main'
// (the 2...Nf6 pill) + the variation tab labels, lower-cased (must match
// variationTabs.ts CURATED['sicilian-alapin']).

export const SICILIAN_ALAPIN_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-sicilianalapin-main'],
  '2...d5': ['mp-sicilianalapin-d5'],
};

export function getSicilianAlapinTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'sicilian-alapin') return null;
  return SICILIAN_ALAPIN_TAB_PLAN_IDS[tabKey] ?? null;
}
