// Tab-plan resolver for the Eric Rosen QGD pro-rep (STEP 12.5). No
// dedicated middlegame plans yet — every tab resolves to [] (allowed; the
// Middlegame section self-hides). Plans ratchet in per the G9 doctrine.
export function getProEricRosenQGDTabPlanIds(openingId: string, _tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-qgd') return null;
  return [];
}
