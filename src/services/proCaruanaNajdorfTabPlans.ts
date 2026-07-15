// Tab-plan resolver for the Caruana Najdorf pro-rep opening. Per the
// doctrine STEP 12.5 rule: without this, plans surface only under the
// main opening tab. Maps a variation tab name (lowercased) to plan IDs.
// The ...Bxd5 outpost plan anchors on the shared Be2/Nd5 path the main
// line and the Classical tab both run through; the English Attack tab
// has no authored plan yet (empty = zone self-hides, never fabricated).

const TAB_PLANS: Record<string, Record<string, string[]>> = {
  'pro-caruana-najdorf': {
    'main': ['mp-pro-caruana-najdorf-outpost'],
    'english attack 6.be3': [],
    'classical 6.be2': ['mp-pro-caruana-najdorf-outpost', 'mp-pro-caruana-najdorf-endgame'],
  },
};

export function getProCaruanaNajdorfTabPlanIds(
  openingId: string,
  tabKey: string
): string[] | null {
  const opening = TAB_PLANS[openingId];
  if (!opening) return null;
  return opening[tabKey.toLowerCase()] ?? null;
}
