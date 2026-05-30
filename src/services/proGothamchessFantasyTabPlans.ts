// Tab-plan resolver for the GothamChess (Levy Rozman) Fantasy Variation pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).
// The …Qb6 plan homes on the main tab (no dedicated …Qb6 tab).

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-fantasy-dxe4-center',
    'mp-progothamchess-fantasy-qb6-na4',
  ],
  'main line 3...dxe4 4.fxe4': [
    'mp-progothamchess-fantasy-dxe4-center',
    'mp-progothamchess-fantasy-qb6-na4',
  ],
  'solid 3...e6': [
    'mp-progothamchess-fantasy-e6-qg4attack',
    'mp-progothamchess-fantasy-bxc3-pair',
  ],
  'aggressive 3...g6': ['mp-progothamchess-fantasy-g6-poisonpawn'],
};

export function getProGothamchessFantasyTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-fantasy-caro') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
