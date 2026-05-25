// Tab → middlegame-plan map for the Caro-Kann masterclass (playbook §0.7
// STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
const CARO_KANN_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-carokann-main',
  advance: 'mp-carokann-advance',
  exchange: 'mp-carokann-exchange',
  'two knights': 'mp-carokann-two-knights',
  panov: 'mp-carokann-panov',
  fantasy: 'mp-carokann-fantasy',
  tartakower: 'mp-carokann-tartakower',
};
export function getCaroKannTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'caro-kann') return null;
  const planId = CARO_KANN_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
