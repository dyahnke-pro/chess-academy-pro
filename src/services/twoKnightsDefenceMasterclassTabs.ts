// Tab → middlegame-plan map for the Two Knights Defence masterclass (§0.7 STEP 4).
const TWO_KNIGHTS_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-twoknightsdefence-main',
  '4.d4 italian': 'mp-twoknightsdefence-d4',
  'fried liver': 'mp-twoknightsdefence-friedliver',
  'max lange': 'mp-twoknightsdefence-maxlange',
};
export function getTwoKnightsDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'two-knights-defence') return null;
  const planId = TWO_KNIGHTS_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
