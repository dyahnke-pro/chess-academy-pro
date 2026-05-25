// Tab → middlegame-plan map for the Grünfeld Defence masterclass (§0.7 STEP 4).
const GRUNFELD_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-grunfelddefence-main',
  'russian system': 'mp-grunfelddefence-russian',
  'classical bc4': 'mp-grunfelddefence-bc4',
  'modern rb1': 'mp-grunfelddefence-rb1',
};
export function getGrunfeldDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'grunfeld-defence') return null;
  const planId = GRUNFELD_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
