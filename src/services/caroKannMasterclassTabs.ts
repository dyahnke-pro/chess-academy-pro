// Tab → middlegame-plan map for the Caro-Kann masterclass (playbook §0.7
// STEP 4). tabKey = lowercased VariationTabs label ('main' for the pill).
// A tab may carry MULTIPLE plan ids — e.g. the main line's middlegame plan
// plus its `-endgame` plan, which EndgamePlansSection renders separately.
const CARO_KANN_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-carokann-main', 'mp-carokann-main-endgame'],
  advance: ['mp-carokann-advance', 'mp-carokann-advance-endgame'],
  exchange: ['mp-carokann-exchange'],
  'two knights': ['mp-carokann-two-knights'],
  panov: ['mp-carokann-panov'],
  fantasy: ['mp-carokann-fantasy'],
  tartakower: ['mp-carokann-tartakower'],
};
export function getCaroKannTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'caro-kann') return null;
  return CARO_KANN_TAB_PLAN_IDS[tabKey] ?? null;
}
