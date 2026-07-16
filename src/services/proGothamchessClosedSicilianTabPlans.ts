// Tab-plan resolver for the GothamChess (Levy Rozman) Closed Sicilian (Nc3).
// The entry carries one variation tab; all data-anchored plans home there
// (STEP 12.5 of the pro-rep doctrine).

const MAIN_IDS = [
  'mp-progothamchess-closedsic-bb5-bg5',
  'mp-progothamchess-closed-sicilian-bb5-trade',
];

const TAB_PLANS: Record<string, string[]> = {
  main: MAIN_IDS,
  'closed sicilian main': MAIN_IDS,
  'vs …d6': ['mp-progothamchess-closedsic-d6-oppositecastle'],
  'vs …e6': ['mp-progothamchess-closedsic-e6-oooattack'],
  'vs …g6 (bxc6)': ['mp-progothamchess-closedsic-g6-nd5'],
};

export function getProGothamchessClosedSicilianTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-closed-sicilian') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
