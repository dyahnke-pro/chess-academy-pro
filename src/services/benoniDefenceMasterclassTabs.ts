// Tab → middlegame-plan map for the Benoni Defence masterclass (§0.7 STEP 4).
const BENONI_TAB_PLAN_IDS: Record<string, string> = {
  main: 'mp-benonidefence-main',
  fianchetto: 'mp-benonidefence-fianchetto',
  taimanov: 'mp-benonidefence-taimanov',
  'four pawns': 'mp-benonidefence-fourpawns',
};
export function getBenoniDefenceTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'benoni-defence') return null;
  const planId = BENONI_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
