// Tab → middlegame-plan map for King's Gambit. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through.
const KINGS_GAMBIT_TAB_PLAN_IDS: Record<string, string> = {
  // Main line (KGA Modern) → the central-bind plan; Classical (3…g5) → the
  // g3-lever / open-f-file plan. Other tabs have no dedicated plan yet, so the
  // section self-hides for them (empty > generic — playbook §0).
  main: 'mp-kings-gambit-bishop-pair-attack',
  classical: 'mp-kings-gambit-open-f-file',
};

export function getKingsGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'kings-gambit') return null;
  const planId = KINGS_GAMBIT_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
