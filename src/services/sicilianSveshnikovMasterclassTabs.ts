// Tab → middlegame-plan map for the Sicilian Sveshnikov masterclass. Keys:
// 'main' (the 9.Nd5 pill) + the variation tab labels, lower-cased (must match
// variationTabs.ts CURATED['sicilian-sveshnikov']).

export const SICILIAN_SVESHNIKOV_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-siciliansveshnikov-main'],
  '9.bxf6': ['mp-siciliansveshnikov-9bxf6'],
  'chelyabinsk c4': ['mp-siciliansveshnikov-chelyabinsk'],
  'anti-svesh 6.nf3': ['mp-siciliansveshnikov-antisvesh'],
  kalashnikov: ['mp-siciliansveshnikov-kalashnikov'],
};

export function getSicilianSveshnikovTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'sicilian-sveshnikov') return null;
  return SICILIAN_SVESHNIKOV_TAB_PLAN_IDS[tabKey] ?? null;
}
