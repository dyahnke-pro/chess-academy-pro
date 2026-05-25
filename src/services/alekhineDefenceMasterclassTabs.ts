// Tab → middlegame-plan map for the Alekhine's Defence masterclass (playbook
// §0.7 STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
const ALEKHINE_DEFENCE_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-alekhinedefence-main',
  'four pawns': 'mp-alekhinedefence-fourpawns',
  exchange: 'mp-alekhinedefence-exchange',
  chase: 'mp-alekhinedefence-chase',
  scandinavian: 'mp-alekhinedefence-scandtrans',
  voronezh: 'mp-alekhinedefence-voronezh',
};
export function getAlekhineDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'alekhine-defence') return null;
  const planId = ALEKHINE_DEFENCE_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
