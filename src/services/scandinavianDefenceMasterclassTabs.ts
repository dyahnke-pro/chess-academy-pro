// Tab → middlegame-plan map for Scandinavian Defence. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through.
const SCANDINAVIAN_DEFENCE_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-scandinaviandefence-main',
  'qa5 solid': 'mp-scandinaviandefence-qa5',
  tiviakov: 'mp-scandinaviandefence-tiviakov',
  modern: 'mp-scandinaviandefence-modern',
  portuguese: 'mp-scandinaviandefence-portuguese',
  icelandic: 'mp-scandinaviandefence-icelandic',
  'gubinsky-melts': 'mp-scandinaviandefence-gubinsky',
};

export function getScandinavianDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'scandinavian-defence') return null;
  const planId = SCANDINAVIAN_DEFENCE_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
