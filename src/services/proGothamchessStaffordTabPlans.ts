// Tab-plan resolver for the GothamChess (Levy Rozman) Stafford Refutation.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).

const TAB_PLANS: Record<string, string[]> = {
  main: ['mp-progothamchess-stafford-consolidate'],
  'main refutation d3': ['mp-progothamchess-stafford-consolidate'],
  '4...dxc6 5.e5 line': ['mp-progothamchess-stafford-e5space'],
};

export function getProGothamchessStaffordTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-stafford-refute') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
