// Tab → middlegame-plan map for the Queen's Gambit Declined masterclass
// (playbook §0.7 STEP 4). tabKey = lowercased VariationTabs label ('main' = pill).
const QGD_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-qgd-main', 'mp-qgd-main-endgame'],
  tartakower: ['mp-qgd-tartakower'],
  lasker: ['mp-qgd-lasker'],
  exchange: ['mp-qgd-exchange'],
  'bf4 lines': ['mp-qgd-bf4'],
};
export function getQgdTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'qgd') return null;
  return QGD_TAB_PLAN_IDS[tabKey] ?? null;
}
