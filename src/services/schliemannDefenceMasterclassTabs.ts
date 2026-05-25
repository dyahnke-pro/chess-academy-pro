// Tab → middlegame-plan map for the Schliemann Defence masterclass (§0.7 STEP 4).
const SCHLIEMANN_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-schliemanndefence-main',
  'schönemann 4.d4': 'mp-schliemanndefence-schonemann',
  '4.exf5': 'mp-schliemanndefence-exf5',
  'dyckhoff 4.d3': 'mp-schliemanndefence-dyckhoff',
};
export function getSchliemannDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'schliemann-defence') return null;
  const planId = SCHLIEMANN_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
