// Tab-plan resolver for the GothamChess (Levy Rozman) Caro Advance (White).
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).
// The h6/qxd4 plans home on the main tab.

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-caroadv-bf5-c4break',
    'mp-progothamchess-caroadv-qxd4-punish',
  ],
  'main line (vs …bf5)': [
    'mp-progothamchess-caroadv-bf5-c4break',
    'mp-progothamchess-caro-advance-h4-pin',
    'mp-progothamchess-caroadv-h6-g4space',
    'mp-progothamchess-caroadv-qxd4-punish',
  ],
  'vs …c5 (botvinnik-carls)': ['mp-progothamchess-caroadv-c5-dxc5'],
};

export function getProGothamchessCaroAdvanceTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-caro-advance-white') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
