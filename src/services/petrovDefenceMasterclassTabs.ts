// Tab → middlegame-plan map for the Petrov Defence masterclass (playbook §0.7
// STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
const PETROV_DEFENCE_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-petrovdefence-main',
  'steinitz 3.d4': 'mp-petrovdefence-steinitz',
  'dxc3 lines': 'mp-petrovdefence-italian',
  'three knights': 'mp-petrovdefence-threeknights',
  '5.bd3': 'mp-petrovdefence-bd3',
};
export function getPetrovDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'petrov-defence') return null;
  const planId = PETROV_DEFENCE_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
