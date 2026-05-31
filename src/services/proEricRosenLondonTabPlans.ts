// Tab-plan resolver for the Eric Rosen London System pro-rep (STEP 12.5).
const TAB_PLANS: Record<string, string[]> = {
  'main': ['mp-proericlondon-ne5-battery'],
  'vs …d5 classical': ['mp-proericlondon-ne5-battery'],
  'vs …e6 setup': ['mp-proericlondon-ne5-battery'],
  'vs …c5 and …qb6': [],
  'vs …d6 (e4 attacking hybrid)': ['mp-proericlondon-h4-storm'],
};
export function getProEricRosenLondonTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-london') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
