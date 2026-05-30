// Tab-plan resolver for the GothamChess (Levy Rozman) QGD. Student = BLACK.
const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-qgd-carlsbad-e5',
    'mp-progothamchess-qgd-tartakower-b6',
  ],
  'classical 5.bf4 line': [
    'mp-progothamchess-qgd-classical',
    'mp-progothamchess-qgd-tartakower-b6',
  ],
  'exchange variation': ['mp-progothamchess-qgd-carlsbad-e5'],
};

export function getProGothamchessQgdTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-qgd') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
