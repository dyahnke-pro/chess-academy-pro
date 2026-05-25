// Tab → middlegame-plan map for the Queen's Indian Defence masterclass (§0.7 STEP 4).
const QID_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-queensindian-main',
  'petrosian a3': 'mp-queensindian-petrosian',
  '…bb4+': 'mp-queensindian-bb4',
  'miles …ba6': 'mp-queensindian-miles',
};
export function getQueensIndianDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'queens-indian') return null;
  const planId = QID_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
