// Tab-plan resolver for the Eric Rosen QGD pro-rep (STEP 12.5). The main tab
// carries a data-grounded ENDGAME plan (suffix -endgame, surfaced by
// EndgamePlansSection); variation tabs resolve to [] (no middlegame plan yet).
export function getProEricRosenQGDTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-qgd') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-proericqgd-endgame'] : [];
}
