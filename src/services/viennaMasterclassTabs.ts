// HAND-PICKED line curation for the Vienna Game masterclass tabs. No
// algorithm decides what shows on a tab. Tab ORDER is locked to amateur
// frequency per the playbook (most-played first); the Classical (Stanley)
// is the lead "Main line" pill (showcase) and stays out of this map.
//
// Vienna amateur frequencies (lichess 1600+, queried 2026-05-21):
//   Gambit (3.f4):        32.2%  → tab 1
//   vs 2...Nc6:           39.0%  of Black's replies → tab 2
//   Frankenstein-Dracula: inside the 20.6% 3.Bc4 slice → tab 3
//   Paulsen (3.g3):       4.2%   → tab 4 (rare at amateur, popular at master)
//
// Keys: 'main' (Classical spine — the showcase) + the 4 variation tab labels,
// lower-cased. Values are exact ids from middlegame-plans.json.

export const VIENNA_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-viennagame-classical'],
  gambit: ['mp-viennagame-gambit'],
  'vs 2…nc6': ['mp-viennagame-vs-nc6'],
  'frankenstein-dracula': ['mp-viennagame-frankenstein-dracula'],
  paulsen: ['mp-viennagame-paulsen'],
};

/** The hand-picked middlegame plan ids for a Vienna tab, or null when the
 *  opening isn't the Vienna (other openings fall back to their own plans).
 *  `tabKey` is 'main' for the main-line tab, else the lower-cased tab label. */
export function getViennaTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'vienna-game') return null;
  return VIENNA_TAB_PLAN_IDS[tabKey] ?? null;
}
