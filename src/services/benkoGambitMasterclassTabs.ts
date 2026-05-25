// Tab → middlegame-plan map for the Benko Gambit masterclass (playbook §0.7
// STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
const BENKO_GAMBIT_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-benkogambit-main',
  declined: 'mp-benkogambit-declined',
  zaitsev: 'mp-benkogambit-zaitsev',
  'half-accepted': 'mp-benkogambit-halfaccepted',
};
export function getBenkoGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'benko-gambit') return null;
  const planId = BENKO_GAMBIT_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
