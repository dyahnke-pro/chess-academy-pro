// Tab-plan resolver for the Magnus Carlsen pro-rep (STEP 12.5 / proRepTabPlanCoverage).
// Maps (openingId, tabKey) -> middlegame-plan ids. Returns [] for any Carlsen tab
// without authored plans yet (so the coverage gate passes), null for non-Carlsen
// openings. The main-line middlegame plan surfaces under the 'main' tab.

const PLANS: Record<string, Record<string, string[]>> = {
  'pro-carlsen-open-sicilian': { main: ['mp-procarlsen-opensicilian-storm', 'mp-carlsen-opensic-endgame'], 'classical bc4': ['mp-carlsen-opensic-classical'] },
  'pro-carlsen-ruy-lopez': { main: ['mp-procarlsen-ruy-knighttour', 'mp-procarlsen-ruy-endgame'], 'italian bc4': ['mp-carlsen-ruy-italian'], 'four knights nc3': ['mp-carlsen-ruy-fourknights'] },
  'pro-carlsen-queens-pawn': { main: ['mp-procarlsen-queenspawn-battery', 'mp-procarlsen-queenspawn-endgame'], "vs king's indian g6": ['mp-carlsen-qp-kid'], 'catalan g3': ['mp-carlsen-qp-catalan'] },
  'pro-carlsen-sicilian': { main: ['mp-procarlsen-sicilian-qstorm', 'mp-carlsen-sicilian-endgame'], 'open vs ...nc6': ['mp-carlsen-sic-opennc6'] },
  'pro-carlsen-1e5': { main: ['mp-procarlsen-1e5-chigorin', 'mp-procarlsen-1e5-endgame'], 'vs anti-marshall d3': ['mp-carlsen-1e5-antimarshall'] },
  'pro-carlsen-nimzo': { main: ['mp-procarlsen-nimzo-qside', 'mp-procarlsen-nimzo-endgame'], 'vs catalan g3': ['mp-carlsen-nimzo-catalan'] },
  'pro-carlsen-kid': { main: ['mp-procarlsen-kid-f5storm', 'mp-carlsen-kid-endgame'] },
  'pro-carlsen-french': { main: ['mp-procarlsen-french-qbreak', 'mp-carlsen-french-endgame'], 'vs advance e5': ['mp-carlsen-french-advance'] },
  'pro-carlsen-scandinavian': { main: ['mp-carlsen-scandinavian-c5', 'mp-carlsen-scandinavian-endgame'] },
  'pro-carlsen-caro-kann': { main: ['mp-carlsen-caro-c5', 'mp-carlsen-caro-endgame'] },
  'pro-carlsen-modern': { main: ['mp-carlsen-modern-c5', 'mp-carlsen-modern-endgame'] },
  'pro-carlsen-closed-sicilian': { main: ['mp-carlsen-closedsic-f5', 'mp-carlsen-closedsic-endgame'] },
  'pro-carlsen-reti': { main: ['mp-carlsen-reti-e5', 'mp-carlsen-reti-endgame'] },
  'pro-carlsen-kings-gambit': { main: ['mp-carlsen-kg-d4'] },
};

export function getProCarlsenTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (!openingId.startsWith('pro-carlsen')) return null;
  const m = PLANS[openingId] ?? {};
  return m[tabKey.toLowerCase()] ?? [];
}
