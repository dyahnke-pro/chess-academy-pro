// Tab-plan resolver for the GothamChess (Levy Rozman) Anti-Sicilian Rossolimo.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-antisic-e6-open',
    'mp-progothamchess-antisic-g6-d4break',
  ],
  'rossolimo 3.bb5 e6': ['mp-progothamchess-antisic-e6-open'],
  'rossolimo 3.bb5 g6': ['mp-progothamchess-antisic-g6-d4break'],
  'accelerated pawn storm (carlsen-inspired)': ['mp-progothamchess-antisic-accel-storm'],
};

export function getProGothamchessAntiSicilianTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-anti-sicilian') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
