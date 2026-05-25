// Tab → middlegame-plan map for King's Gambit. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through.
const KINGS_GAMBIT_TAB_PLAN_IDS: Record<string, string> = {
  // main: 'mp-kingsgambit-main',
  // '<lowercased tab label>': 'mp-kingsgambit-<tab>',
};

export function getKingsGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'kings-gambit') return null;
  const planId = KINGS_GAMBIT_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
