// Tab-plan resolver for the Eric Rosen QGD pro-rep (STEP 12.5). The main tab
// carries the middlegame + endgame plans (EndgamePlansSection filters the
// -endgame suffix); variation tabs resolve to [] (no dedicated plan yet).
export function getProEricRosenQGDTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-qgd') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-proericqgd-minority-counter', 'mp-proericqgd-endgame'] : [];
}
