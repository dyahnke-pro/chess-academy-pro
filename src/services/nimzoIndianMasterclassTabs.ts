// Tab → middlegame-plan map for the Nimzo-Indian masterclass (playbook §0.7
// STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
const NIMZO_INDIAN_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-nimzoindian-main',
  rubinstein: 'mp-nimzoindian-rubinstein',
  hübner: 'mp-nimzoindian-huebner',
  leningrad: 'mp-nimzoindian-leningrad',
  kasparov: 'mp-nimzoindian-kasparov',
  sämisch: 'mp-nimzoindian-saemisch',
  '4.f3': 'mp-nimzoindian-f3',
  fischer: 'mp-nimzoindian-fischer',
};
export function getNimzoIndianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'nimzo-indian') return null;
  const planId = NIMZO_INDIAN_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
