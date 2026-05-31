// Tab-plan resolver for the Eric Rosen French pro-rep (STEP 12.5). The main tab
// carries the middlegame + endgame plans (EndgamePlansSection filters the
// -endgame suffix); variation tabs resolve to [] (no dedicated plan yet).
export function getProEricRosenFrenchTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-french') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-proericfrench-c5break', 'mp-proericfrench-endgame'] : [];
}
