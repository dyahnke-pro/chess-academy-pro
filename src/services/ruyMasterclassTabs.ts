// HAND-PICKED line curation for the Ruy Lopez masterclass tabs. No
// algorithm decides what shows on a tab — every middlegame plan id below
// was chosen deliberately for that specific line (David's directive
// 2026-05-21: "I want you hand picking all lines that go into these
// tabs. no algos make decisions like that").
//
// Keys: 'main' (the Closed main line, the showcase) + the 7 variation
// tab labels, lower-cased. Values are exact ids from middlegame-plans.json.

export const RUY_TAB_PLAN_IDS: Record<string, string[]> = {
  main: ['mp-ruylopez-d4', 'mp-ruylopez-f4'],
  berlin: ['mp-ruylopez-berlin', 'mp-ruylopez-berlin-endgame'],
  open: ['mp-ruylopez-open'],
  marshall: ['mp-ruylopez-marshall'],
  exchange: ['mp-ruylopez-exchange', 'mp-ruylopez-exchange-endgame'],
  breyer: ['mp-ruylopez-breyer', 'mp-ruylopez-breyer-endgame'],
  chigorin: ['mp-ruylopez-chigorin', 'mp-ruylopez-chigorin-endgame'],
  zaitsev: ['mp-ruylopez-zaitsev', 'mp-ruylopez-zaitsev-endgame'],
};

/** The hand-picked middlegame plan ids for a Ruy tab, or null when the
 *  opening isn't the Ruy (other openings fall back to their own plans).
 *  `tabKey` is 'main' for the main-line tab, else the lower-cased tab label. */
export function getRuyTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'ruy-lopez') return null;
  return RUY_TAB_PLAN_IDS[tabKey] ?? null;
}
