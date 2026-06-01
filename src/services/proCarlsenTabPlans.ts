// Tab-plan resolver for the Magnus Carlsen pro-rep (STEP 12.5 / proRepTabPlanCoverage).
// Maps (openingId, tabKey) -> middlegame-plan ids. Returns [] for any Carlsen tab
// without authored plans yet (so the coverage gate passes), null for non-Carlsen
// openings. The main-line middlegame plan surfaces under the 'main' tab.

const PLANS: Record<string, Record<string, string[]>> = {
  'pro-carlsen-open-sicilian': { main: ['mp-procarlsen-opensicilian-storm'] },
  'pro-carlsen-ruy-lopez': { main: ['mp-procarlsen-ruy-knighttour', 'mp-procarlsen-ruy-endgame'] },
  'pro-carlsen-queens-pawn': { main: ['mp-procarlsen-queenspawn-battery', 'mp-procarlsen-queenspawn-endgame'] },
  'pro-carlsen-sicilian': { main: ['mp-procarlsen-sicilian-qstorm'] },
  'pro-carlsen-1e5': { main: ['mp-procarlsen-1e5-chigorin', 'mp-procarlsen-1e5-endgame'] },
  'pro-carlsen-nimzo': { main: ['mp-procarlsen-nimzo-qside', 'mp-procarlsen-nimzo-endgame'] },
  'pro-carlsen-kid': { main: ['mp-procarlsen-kid-f5storm'] },
  'pro-carlsen-french': { main: ['mp-procarlsen-french-qbreak'] },
};

export function getProCarlsenTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (!openingId.startsWith('pro-carlsen')) return null;
  const m = PLANS[openingId] ?? {};
  return m[tabKey.toLowerCase()] ?? [];
}
