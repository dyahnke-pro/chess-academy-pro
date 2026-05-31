// Tab-plan resolver for the Eric Rosen ClosedSicilian pro-rep (STEP 12.5). No
// dedicated middlegame plans yet — every tab resolves to [] (allowed; the
// Middlegame section self-hides). Plans ratchet in per the G9 doctrine.
export function getProEricRosenClosedSicilianTabPlanIds(openingId: string, _tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-closed-sicilian') return null;
  return [];
}
