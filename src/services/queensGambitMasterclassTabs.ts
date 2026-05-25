// Tab → middlegame-plan map for Queen's Gambit. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through.
const QUEENS_GAMBIT_TAB_PLAN_IDS: Record<string, string> = {
  // main: 'mp-queensgambit-main',
  // '<lowercased tab label>': 'mp-queensgambit-<tab>',
};

export function getQueensGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'queens-gambit') return null;
  const planId = QUEENS_GAMBIT_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
