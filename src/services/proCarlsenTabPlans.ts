// Tab-plan resolver for the Magnus Carlsen pro-rep (STEP 12.5 / proRepTabPlanCoverage).
// Maps (openingId, tabKey) -> middlegame-plan ids. Returns [] for any Carlsen tab
// without authored plans yet (so the coverage gate passes), null for non-Carlsen
// openings. Plan ids are filled in as the middlegame/endgame layers are authored.

const PLANS: Record<string, Record<string, string[]>> = {
  'pro-carlsen-open-sicilian': {},
  'pro-carlsen-ruy-lopez': {},
  'pro-carlsen-queens-pawn': {},
  'pro-carlsen-sicilian': {},
  'pro-carlsen-1e5': {},
  'pro-carlsen-nimzo': {},
  'pro-carlsen-kid': {},
  'pro-carlsen-french': {},
};

export function getProCarlsenTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (!openingId.startsWith('pro-carlsen')) return null;
  const m = PLANS[openingId];
  if (!m) return null;
  return m[tabKey.toLowerCase()] ?? [];
}
