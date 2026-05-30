// Tab-plan resolver for the GothamChess (Levy Rozman) Trompowsky pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs. Without this, the plans surface only
// under the main opening tab (STEP 12.5 of the pro-rep doctrine).
//
// The pro entry carries 4 tabs; the …c5 b2-gambit plan has no dedicated tab,
// so it homes on the main line as a representative sharp plan.

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-tromp-e6-bishoppair',
    'mp-progothamchess-tromp-c5-gambit',
  ],
  'main line vs …e6': ['mp-progothamchess-tromp-e6-bishoppair'],
  'vaganian attack (…ne4)': ['mp-progothamchess-tromp-vaganian-gambit'],
  '…d5 system': ['mp-progothamchess-tromp-d5-squeeze'],
  '…g6 fianchetto': ['mp-progothamchess-tromp-g6-doubled'],
};

export function getProGothamchessTrompowskyTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-trompowsky') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
