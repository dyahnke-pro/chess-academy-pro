// Tab → middlegame-plan map for the Queen's Gambit (White) masterclass.
// Hand-picked (no algo). Keys: 'main' (the Classical Orthodox pill) + the 6
// variation tab labels, lower-cased (must match variationTabs.ts
// CURATED['queens-gambit']).

export const QUEENS_GAMBIT_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-queensgambit-main'],
  exchange: ['mp-queensgambit-exchange'],
  qga: ['mp-queensgambit-qga'],
  slav: ['mp-queensgambit-slav'],
  'semi-slav': ['mp-queensgambit-semislav'],
  tartakower: ['mp-queensgambit-tartakower'],
  'anti-bf4': ['mp-queensgambit-antibf4'],
};

/** The hand-picked middlegame plan ids for a Queen's Gambit tab, or null when
 *  the opening isn't the Queen's Gambit. `tabKey` is 'main' for the main-line
 *  tab, else the lower-cased tab label. */
export function getQueensGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'queens-gambit') return null;
  return QUEENS_GAMBIT_TAB_PLAN_IDS[tabKey] ?? null;
}
