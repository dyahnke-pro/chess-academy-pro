// Tab-plan resolver for the Eric Rosen Budapest pro-rep (STEP 12.5). No
// dedicated middlegame plans yet — every tab resolves to [] (allowed; the
// Middlegame section self-hides). Plans ratchet in per the G9 doctrine.
export function getProEricRosenBudapestTabPlanIds(openingId: string, _tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-budapest') return null;
  return [];
}
