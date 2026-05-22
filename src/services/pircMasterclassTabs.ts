// HAND-PICKED line curation for the Pirc Defence masterclass tabs.
// Parallel to ruyMasterclassTabs.ts — no algorithm decides what shows on
// a tab. Each middlegame plan id below was chosen deliberately for that
// specific White system (David's directive: hand-pick everything).
//
// Keys are the variation tab labels, lower-cased — for the Pirc these
// are the full variation names (no curated short-label set), e.g.
// 'austrian attack'. Values are exact ids from middlegame-plans.json.
// Every Pirc middlegame plan is White-system-specific, so each lands on
// its own variation tab. The MAIN line carries NO plan (the Pirc main
// line is just the d6/Nf6/g6 move-order; a concrete plan only exists once
// White commits to a system) — `main: []` keeps the section empty there
// instead of falling through to "show every plan" (playbook §3:
// empty > generic).

export const PIRC_TAB_PLAN_IDS: Record<string, string[]> = {
  main: [],
  'austrian attack': ['mp-pircdefence-austrian'],
  'classical system': ['mp-pircdefence-classical'],
  '150 attack': ['mp-pircdefence-150'],
  'byrne variation': ['mp-pircdefence-byrne'],
  'lion variation': ['mp-pircdefence-lion'],
  'fianchetto system': ['mp-pircdefence-fianchetto'],
  'czech defence': ['mp-pircdefence-czech'],
  'austrian attack with e5 c5': ['mp-pircdefence-austrian-e5'],
};

/** The hand-picked middlegame plan ids for a Pirc tab, or null when the
 *  opening isn't the Pirc (other openings fall back to their own logic).
 *  `tabKey` is 'main' for the main-line tab, else the lower-cased tab
 *  label. */
export function getPircTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pirc-defence') return null;
  return PIRC_TAB_PLAN_IDS[tabKey] ?? null;
}
