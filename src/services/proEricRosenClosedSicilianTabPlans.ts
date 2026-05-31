// Tab-plan resolver for the Eric Rosen ClosedSicilian pro-rep (STEP 12.5). The main tab
// carries a data-grounded ENDGAME plan (suffix -endgame, surfaced by
// EndgamePlansSection); variation tabs resolve to [] (no middlegame plan yet).
export function getProEricRosenClosedSicilianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-closed-sicilian') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-proericclosedsic-endgame'] : [];
}
