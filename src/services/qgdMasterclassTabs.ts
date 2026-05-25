// Tab → middlegame-plan map for Queen's Gambit Declined. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through.
const QGD_TAB_PLAN_IDS: Record<string, string> = {
  // main: 'mp-qgd-main',
  // '<lowercased tab label>': 'mp-qgd-<tab>',
};

export function getQgdTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'qgd') return null;
  const planId = QGD_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
