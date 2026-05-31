// Tab-plan resolver for the Eric Rosen Scandinavian pro-rep (STEP 12.5). The main tab
// carries the middlegame + endgame plans (EndgamePlansSection filters the
// -endgame suffix); variation tabs resolve to [] (no dedicated plan yet).
export function getProEricRosenScandinavianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-scandinavian') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-proericscandi-e5break'] : [];
}
