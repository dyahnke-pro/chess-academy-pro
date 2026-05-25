// Tab → middlegame-plan map for the Philidor Defence masterclass (playbook
// §0.7 STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
const PHILIDOR_DEFENCE_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-philidordefence-main',
  exchange: 'mp-philidordefence-exchange',
  antoshin: 'mp-philidordefence-antoshin',
  nimzowitsch: 'mp-philidordefence-nimzowitsch',
  'counter-gambit': 'mp-philidordefence-countergambit',
};
export function getPhilidorDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'philidor-defence') return null;
  const planId = PHILIDOR_DEFENCE_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
