// Tab → middlegame-plan map for the Sicilian Najdorf masterclass. Hand-picked.
// Keys: 'main' (the English Attack pill) + the variation tab labels,
// lower-cased (must match variationTabs.ts CURATED['sicilian-najdorf']).

export const SICILIAN_NAJDORF_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-siciliannajdorf-main'],
  classical: ['mp-siciliannajdorf-classical'],
  '6.bg5': ['mp-siciliannajdorf-6bg5'],
  'poisoned pawn': ['mp-siciliannajdorf-poisoned'],
  '6.f3': ['mp-siciliannajdorf-6f3'],
  'fischer-sozin': ['mp-siciliannajdorf-fischer'],
  '6.g3': ['mp-siciliannajdorf-6g3'],
  ng4: ['mp-siciliannajdorf-ng4'],
  '6.a4': ['mp-siciliannajdorf-6a4'],
};

/** The hand-picked middlegame plan ids for a Najdorf tab, or null when the
 *  opening isn't the Najdorf. `tabKey` is 'main' for the main-line tab, else
 *  the lower-cased tab label. */
export function getSicilianNajdorfTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'sicilian-najdorf') return null;
  return SICILIAN_NAJDORF_TAB_PLAN_IDS[tabKey] ?? null;
}
