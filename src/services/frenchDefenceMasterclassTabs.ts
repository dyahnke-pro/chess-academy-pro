// Tab → middlegame-plan map for the French Defence masterclass (playbook §0.7
// STEP 4). tabKey is the lowercased VariationTabs label ('main' for the pill).
// Wired into OpeningDetailPage's subjectPlanIds chain. Returns null for other
// openings so the chain falls through.
const FRENCH_DEFENCE_TAB_PLAN_IDS: Record<string, string[]> = {
  // The main pill (Steinitz) carries the endgame plan; its middlegame ideas
  // live on the variation tabs.
  main: ['mp-frenchdefence-main-endgame'],
  exchange: ['mp-frenchdefence-exchange'],
  advance: ['mp-frenchdefence-advance'],
  tarrasch: ['mp-frenchdefence-tarrasch'],
  rubinstein: ['mp-frenchdefence-rubinstein'],
  winawer: ['mp-frenchdefence-winawer'],
  classical: ['mp-frenchdefence-classical'],
  burn: ['mp-frenchdefence-burn'],
  mccutcheon: ['mp-frenchdefence-mccutcheon'],
  'milner-barry': ['mp-frenchdefence-milnerbarry'],
  'fort knox': ['mp-frenchdefence-fortknox'],
};

export function getFrenchDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'french-defence') return null;
  return FRENCH_DEFENCE_TAB_PLAN_IDS[tabKey] ?? null;
}
