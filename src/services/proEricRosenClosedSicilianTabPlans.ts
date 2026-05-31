// Tab-plan resolver for the Eric Rosen ClosedSicilian pro-rep (STEP 12.5). The main tab
// carries the middlegame + endgame plans (EndgamePlansSection filters the
// -endgame suffix); variation tabs resolve to [] (no dedicated plan yet).
export function getProEricRosenClosedSicilianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-closed-sicilian') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-proericclosedsic-f5storm', 'mp-proericclosedsic-endgame'] : [];
}
