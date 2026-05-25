// Tab → middlegame-plan map for the Semi-Slav masterclass (playbook §0.7 STEP 4).
const SEMI_SLAV_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-semislav-main',
  meran: 'mp-semislav-meran',
  botvinnik: 'mp-semislav-botvinnik',
  moscow: 'mp-semislav-moscow',
  stoltz: 'mp-semislav-stoltz',
};
export function getSemiSlavTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'semi-slav') return null;
  const planId = SEMI_SLAV_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
