// Tab → middlegame-plan map for the English Opening masterclass. Hand-picked
// (no algo). Keys: 'main' (the Reversed Sicilian pill) + the 2 variation tab
// labels, lower-cased (must match variationTabs.ts CURATED['english-opening']).

export const ENGLISH_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-englishopening-main'],
  symmetrical: ['mp-englishopening-symmetrical'],
  mikenas: ['mp-englishopening-mikenas'],
};

/** The hand-picked middlegame plan ids for an English tab, or null when the
 *  opening isn't the English. `tabKey` is 'main' for the main-line tab, else
 *  the lower-cased tab label. */
export function getEnglishTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'english-opening') return null;
  return ENGLISH_TAB_PLAN_IDS[tabKey] ?? null;
}
