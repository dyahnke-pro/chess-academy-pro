// Tab → middlegame-plan map for the Queen's Gambit Accepted masterclass
// (playbook §0.7 STEP 4). tabKey = lowercased VariationTabs label ('main' = pill).
const QGA_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-qga-main',
  smyslov: 'mp-qga-smyslov',
  sadler: 'mp-qga-sadler',
  janowski: 'mp-qga-janowski',
};
export function getQgaTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'qga') return null;
  const planId = QGA_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
