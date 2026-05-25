// Tab → middlegame-plan map for the King's Indian Defence masterclass (§0.7 STEP 4).
const KID_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-kingsindiandefence-main',
  bayonet: 'mp-kingsindiandefence-bayonet',
  'four pawns': 'mp-kingsindiandefence-fourpawns',
  fianchetto: 'mp-kingsindiandefence-fianchetto',
};
export function getKingsIndianDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'kings-indian-defence') return null;
  const planId = KID_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
