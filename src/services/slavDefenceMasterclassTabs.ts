// Tab → middlegame-plan map for the Slav Defence masterclass (playbook §0.7
// STEP 4). tabKey = lowercased VariationTabs label ('main' = pill).
const SLAV_DEFENCE_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-slavdefence-main',
  'geller gambit': 'mp-slavdefence-geller',
  schlechter: 'mp-slavdefence-schlechter',
};
export function getSlavDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'slav-defence') return null;
  const planId = SLAV_DEFENCE_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
