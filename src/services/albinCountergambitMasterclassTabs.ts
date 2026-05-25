// Tab → middlegame-plan map for the Albin Countergambit masterclass (§0.7 STEP 4).
const ALBIN_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-albincountergambit-main',
  fianchetto: 'mp-albincountergambit-fianchetto',
  'lasker trap': 'mp-albincountergambit-lasker',
  spassky: 'mp-albincountergambit-spassky',
};
export function getAlbinCountergambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'albin-countergambit') return null;
  const planId = ALBIN_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
