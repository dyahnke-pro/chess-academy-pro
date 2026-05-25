// Tab → middlegame-plan map for the Old Indian Defence masterclass (§0.7 STEP 4).
const OLD_INDIAN_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-oldindiandefence-main',
  czech: 'mp-oldindiandefence-czech',
  'be2 system': 'mp-oldindiandefence-be2',
};
export function getOldIndianDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'old-indian-defence') return null;
  const planId = OLD_INDIAN_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
