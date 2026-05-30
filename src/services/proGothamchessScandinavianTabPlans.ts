// Tab-plan resolver for the GothamChess (Levy Rozman) Scandinavian Defense.
// Student = BLACK. Maps each variation tab to its plan IDs (STEP 12.5).

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-scand-qa5-bxc3',
    'mp-progothamchess-scand-nf6bg4-oooattack',
  ],
  'main line qa5': [
    'mp-progothamchess-scand-qa5-bxc3',
    'mp-progothamchess-scandi-portuguese',
  ],
  '2...nf6 scandinavian': [
    'mp-progothamchess-scand-nf6bg4-oooattack',
    'mp-progothamchess-scand-nf6nc3-bg4pin',
    'mp-progothamchess-scand-bb5-ne5',
  ],
};

export function getProGothamchessScandinavianTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-scandinavian') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
