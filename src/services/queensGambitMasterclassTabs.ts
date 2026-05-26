// Tab → middlegame-plan map for Queen's Gambit. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through. Tab ORDER is locked to amateur frequency; the
// Classical Orthodox QGD is the lead "Main line" pill and maps via 'main'.
// The Classical Orthodox main line and the Exchange both head into the
// Carlsbad minority-attack structure, so they share that plan.
const QUEENS_GAMBIT_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-queensgambit-minority'],
  exchange: ['mp-queensgambit-minority'],
  accepted: ['mp-queensgambit-accepted'],
  slav: ['mp-queensgambit-slav'],
};

export function getQueensGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'queens-gambit') return null;
  return QUEENS_GAMBIT_TAB_PLAN_IDS[tabKey] ?? null;
}
