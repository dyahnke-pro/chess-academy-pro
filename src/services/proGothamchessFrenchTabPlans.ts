// Tab-plan resolver for the GothamChess (Levy Rozman) French Defense. Student=BLACK.
const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-french-rubinstein-qxd4',
    'mp-progothamchess-french-tarrasch-b5gambit',
  ],
  'rubinstein main line': [
    'mp-progothamchess-french-rubinstein-qxd4',
    'mp-progothamchess-french-defense-rubinstein',
  ],
  'tarrasch (nd2)': ['mp-progothamchess-french-tarrasch-b5gambit'],
  'exchange (exd5 lines)': [
    'mp-progothamchess-french-exchange-develop',
    'mp-progothamchess-french-advance-counter',
  ],
};

export function getProGothamchessFrenchTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-french-defense') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
