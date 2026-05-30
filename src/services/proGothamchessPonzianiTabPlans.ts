// Tab-plan resolver for the GothamChess (Levy Rozman) Ponziani pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-ponziani-main-qb3',
    'mp-progothamchess-ponziani-nxe4-gambit',
  ],
  'main line 3...nf6 4.d4': [
    'mp-progothamchess-ponziani-main-qb3',
    'mp-progothamchess-ponziani-d4-thrust',
    'mp-progothamchess-ponziani-nxe4-gambit',
  ],
  '3...d5 central counter': ['mp-progothamchess-ponziani-d5-qa4'],
};

export function getProGothamchessPonzianiTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-ponziani') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
