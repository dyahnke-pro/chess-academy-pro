// Tab → middlegame-plan map for the Budapest Gambit masterclass (§0.7 STEP 4).
const BUDAPEST_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-budapestgambit-main',
  adler: 'mp-budapestgambit-adler',
  fajarowicz: 'mp-budapestgambit-fajarowicz',
};
export function getBudapestGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'budapest-gambit') return null;
  const planId = BUDAPEST_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
