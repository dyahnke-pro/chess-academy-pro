// Tab → middlegame-plan map for the Dutch Defence masterclass (playbook §0.7
// STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
const DUTCH_DEFENCE_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-dutchdefence-main',
  stonewall: 'mp-dutchdefence-stonewall',
  classical: 'mp-dutchdefence-classical',
  'ilyin-zhenevsky': 'mp-dutchdefence-ilyinzhenevsky',
  'leningrad …e5': 'mp-dutchdefence-leningrade5',
};
export function getDutchDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'dutch-defence') return null;
  const planId = DUTCH_DEFENCE_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
