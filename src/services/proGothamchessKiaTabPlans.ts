// Tab-plan resolver for the GothamChess (Levy Rozman) King's Indian Attack.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-kia-e5-kingside',
    'mp-progothamchess-kia-system-attack',
  ],
  'vs …d5 + …c5': [
    'mp-progothamchess-kia-e5-kingside',
    'mp-progothamchess-kia-system-attack',
  ],
  'vs sicilian (kia vs …c5 + …nf6)': ['mp-progothamchess-kia-sicilian-reroute'],
};

export function getProGothamchessKiaTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-kia') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
