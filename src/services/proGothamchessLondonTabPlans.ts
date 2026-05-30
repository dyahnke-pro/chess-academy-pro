// Tab-plan resolver for the GothamChess (Levy Rozman) London System pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).
//
// The pro entry carries 3 tabs: Standard vs d5, vs KID, Jobava hybrid. The
// e6/c6 plans home on the Standard tab as related London structures.

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-london-standard-ne5',
    'mp-progothamchess-london-classical-attack',
  ],
  'standard setup vs d5': [
    'mp-progothamchess-london-standard-ne5',
    'mp-progothamchess-london-e6-classical',
    'mp-progothamchess-london-c6-c4break',
  ],
  "vs king's indian (bh6 + opposite-side castle attack)": [
    'mp-progothamchess-london-kid-rooksac',
  ],
  'aggressive jobava-london hybrid': [
    'mp-progothamchess-london-jobava-nb5',
  ],
};

export function getProGothamchessLondonTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-london') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
