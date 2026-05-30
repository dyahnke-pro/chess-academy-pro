// Tab-plan resolver for the GothamChess (Levy Rozman) Milner-Barry Gambit.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-mb-main-fstorm',
    'mp-progothamchess-mb-advance-battery',
  ],
  'main gambit line': [
    'mp-progothamchess-mb-main-fstorm',
    'mp-progothamchess-french-rubinstein',
  ],
  'black declines with bd7': ['mp-progothamchess-mb-declines-na4'],
  'anti-french 3.e5 advance': ['mp-progothamchess-mb-advance-battery'],
};

export function getProGothamchessMilnerBarryTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-milner-barry') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
