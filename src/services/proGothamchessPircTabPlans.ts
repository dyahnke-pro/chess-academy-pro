// Tab-plan resolver for the GothamChess (Levy Rozman) Pirc Defense. Student=BLACK.
const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-pirc-austrian-c5',
    'mp-progothamchess-pirc-classical-e5',
  ],
  'austrian attack (f4)': [
    'mp-progothamchess-pirc-austrian-c5',
    'mp-progothamchess-pirc-c5-break',
  ],
  'classical (nf3 setup)': ['mp-progothamchess-pirc-classical-e5'],
  '150 attack (be3 + f3)': ['mp-progothamchess-pirc-150-b5'],
};

export function getProGothamchessPircTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-pirc-defense') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
