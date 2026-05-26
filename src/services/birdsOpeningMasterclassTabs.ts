// Tab → middlegame-plan map for Bird's Opening (playbook §0.7 STEP 4).
const BIRDS_OPENING_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-birdsopening-main'],
  stonewall: ['mp-birdsopening-stonewall'],
  'nimzo-larsen': ['mp-birdsopening-nimzo'],
};

export function getBirdsOpeningTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'birds-opening') return null;
  return BIRDS_OPENING_TAB_PLAN_IDS[tabKey] ?? null;
}
