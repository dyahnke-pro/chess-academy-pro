// Tab-plan resolver for the GothamChess (Levy Rozman) Scandinavian Defense.
// Student = BLACK. Maps each variation tab to its plan IDs (STEP 12.5).

const TAB_PLANS: Record<string, string[]> = {
  main: ['mp-progothamchess-scand-qa5-bxc3'],
  'main line qa5': ['mp-progothamchess-scand-qa5-bxc3'],
  '2...nf6 scandinavian': [],
  'portuguese …bg4': [
    'mp-progothamchess-scandi-portuguese',
    'mp-progothamchess-scand-nf6bg4-oooattack',
  ],
  'vs nc3 (nxd5)': ['mp-progothamchess-scand-nf6nc3-bg4pin'],
  'vs bb5+': ['mp-progothamchess-scand-bb5-ne5'],
};

export function getProGothamchessScandinavianTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-scandinavian') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
