// Tab-plan resolver for the Eric Rosen Sicilian pro-rep (STEP 12.5).
const TAB_PLANS: Record<string, string[]> = {
  'main': ['mp-proericsicilian-maroczy-a5'],
  'taimanov (…e6)': [],
  'vs rossolimo (bb5)': [],
  'vs alapin (c3)': [],
  'vs 2.nc3': [],
};
export function getProEricRosenSicilianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-sicilian') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
