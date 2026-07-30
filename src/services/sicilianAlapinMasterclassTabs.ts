// Tab → middlegame-plan map for the Sicilian Alapin masterclass. Keys: 'main'
// (the 2...Nf6 pill) + the variation tab labels, lower-cased (must match
// variationTabs.ts CURATED['sicilian-alapin']).

export const SICILIAN_ALAPIN_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-sicilianalapin-main'],
  // Every curated tab needs an EXPLICIT entry — an unmapped tab key returns
  // null, which the detail page treats as "no filter" and renders every plan
  // on that tab (the Glek leak, 2026-07-30). The old '2...d5' key matched no
  // actual tab label (labels lower-case to '2...d5 iqp' etc), so the d5 plan
  // reached its tab only via the leak.
  '2...nf6 main': [],
  '2...d5 iqp': ['mp-sicilianalapin-d5'],
  '2...e6': [],
  '2...g6': [],
  '2...nf6 5.nf3': [],
  '2...d5 qxd5': ['mp-sicilianalapin-d5'],
  '2...nf6 iqp': [],
  '2...d5 nf6': [],
  'stoltz 4.nf3': [],
};

export function getSicilianAlapinTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'sicilian-alapin') return null;
  return SICILIAN_ALAPIN_TAB_PLAN_IDS[tabKey] ?? null;
}
