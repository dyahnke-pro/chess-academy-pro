// Tab → middlegame-plan map for the Eric Rosen Stafford masterclass (David
// 2026-05-27). Hand-picked (no algo). Keys: 'main' + the lower-cased variation
// tab labels (must match the opening's variation names in pro-repertoires.json).

export const STAFFORD_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-proericrosenstafford-main'],
  'nxc6 main line': ['mp-proericrosenstafford-main'],
};

/** The hand-picked middlegame plan ids for a Stafford tab, or null when the
 *  opening isn't the Stafford. `tabKey` is 'main' for the main-line tab, else
 *  the lower-cased tab label. */
export function getStaffordTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-ericrosen-stafford') return null;
  return STAFFORD_TAB_PLAN_IDS[tabKey] ?? null;
}
