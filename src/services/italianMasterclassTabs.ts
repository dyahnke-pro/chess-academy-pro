// HAND-PICKED line curation for the Italian Game masterclass tabs. No
// algorithm decides what shows on a tab. The Giuoco Piano main line is the
// lead "Main line" pill (showcase) and stays out of this map. Tab ORDER is
// set in variationTabs.ts by reasoned amateur prevalence (explorer freq was
// unavailable at build time — flagged for prod verification).
//
// Keys: 'main' (Giuoco Piano spine — the showcase) + the 4 variation tab
// labels, lower-cased. Values are exact ids from middlegame-plans.json.

export const ITALIAN_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-italiangame-main'],
  modern: ['mp-italiangame-modern'],
  'two knights': ['mp-italiangame-twoknights'],
  'evans gambit': ['mp-italiangame-evans'],
  'møller': ['mp-italiangame-moller'],
};

/** The hand-picked middlegame plan ids for an Italian tab, or null when the
 *  opening isn't the Italian (other openings fall back to their own plans).
 *  `tabKey` is 'main' for the main-line tab, else the lower-cased tab label. */
export function getItalianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'italian-game') return null;
  return ITALIAN_TAB_PLAN_IDS[tabKey] ?? null;
}
