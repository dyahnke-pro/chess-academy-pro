// Tab → middlegame-plan map for Trompowsky Attack. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings.
const TROMPOWSKY_ATTACK_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-trompowskyattack-main'],
  raptor: ['mp-trompowskyattack-raptor'],
  '2...e6': ['mp-trompowskyattack-e6'],
};

export function getTrompowskyAttackTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'trompowsky-attack') return null;
  return TROMPOWSKY_ATTACK_TAB_PLAN_IDS[tabKey] ?? null;
}
