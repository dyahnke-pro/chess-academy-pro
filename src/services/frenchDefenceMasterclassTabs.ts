// Tab → middlegame-plan map for French Defence. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through.
const FRENCH_DEFENCE_TAB_PLAN_IDS: Record<string, string> = {
  // main: 'mp-frenchdefence-main',
  // '<lowercased tab label>': 'mp-frenchdefence-<tab>',
};

export function getFrenchDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'french-defence') return null;
  const planId = FRENCH_DEFENCE_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
