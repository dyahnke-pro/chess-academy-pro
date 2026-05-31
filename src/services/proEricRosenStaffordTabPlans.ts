// Tab-plan resolver for the Eric Rosen Stafford Gambit pro-rep. Per STEP 12.5
// of the pro-rep doctrine: without this, all plans surface only under the main
// opening tab and the variation tabs show "no plans for this scope". Each entry
// maps a variation tab name (lowercased) to its plan IDs. An explicit [] means
// "no dedicated plan for this tab yet" — allowed (the Stafford's attacking idea
// is the same across the accepted lines, so several tabs share the main plan's
// theme rather than duplicating it).

const TAB_PLANS: Record<string, string[]> = {
  'main': ['mp-proericstafford-main-hstorm'],
  'five knights (5.nc3)': ['mp-proericstafford-nc3-openh'],
  'space grab (5.e5)': [],
  'knight retreat (4.nf3)': [],
  'four knights decline (3.nc3)': ['mp-proericstafford-fourknights-bishop'],
  'pawn returned (4.d4)': [],
};

export function getProEricRosenStaffordTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-ericrosen-stafford') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
