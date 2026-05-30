// Tab-plan resolver for the GothamChess (Levy Rozman) Closed Sicilian (Nc3).
// The entry carries one variation tab; all data-anchored plans home there
// (STEP 12.5 of the pro-rep doctrine).

const PLAN_IDS = [
  'mp-progothamchess-closedsic-bb5-bg5',
  'mp-progothamchess-closed-sicilian-bb5-trade',
  'mp-progothamchess-closedsic-d6-oppositecastle',
  'mp-progothamchess-closedsic-e6-oooattack',
  'mp-progothamchess-closedsic-g6-nd5',
];

const TAB_PLANS: Record<string, string[]> = {
  main: PLAN_IDS,
  'closed sicilian main': PLAN_IDS,
};

export function getProGothamchessClosedSicilianTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-closed-sicilian') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
