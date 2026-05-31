// Tab-plan resolver for the Eric Rosen French pro-rep (STEP 12.5). The main tab
// carries a data-grounded ENDGAME plan (suffix -endgame, surfaced by
// EndgamePlansSection); variation tabs resolve to [] (no middlegame plan yet).
export function getProEricRosenFrenchTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-french') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-proericfrench-endgame'] : [];
}
