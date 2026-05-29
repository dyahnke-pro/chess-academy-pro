// Tab-plan resolver for pro-naroditsky-kid (per the doctrine STEP 12.5
// fix). Routes each variation tab to its hand-authored middlegame
// plan(s); without this, all plans surface only under the main tab.
// Updated 2026-05-29 to surface 2 plans per variation per David's
// "always attempt for 2" directive.

export const PRO_NARODITSKY_KID_TAB_PLAN_IDS: Record<string, string[]> = {
  main: [],
  'classical mar del plata (be2)': ['mp-pronaroKID-classical-kingside', 'mp-pronaroKID-classical-c5'],
  'fianchetto variation (g3)': ['mp-pronaroKID-fianchetto-queenside', 'mp-pronaroKID-fianchetto-simplify'],
  'anti-kid with nf3 first': ['mp-pronaroKID-antikidnf3-yugoslav', 'mp-pronaroKID-antikidnf3-rooklift'],
  'makogonov (h3)': ['mp-pronaroKID-makogonov-kingside', 'mp-pronaroKID-makogonov-nc5'],
  'sämisch (f3)': ['mp-pronaroKID-saemisch-queenside', 'mp-pronaroKID-saemisch-central'],
  'petrosian / nge2': ['mp-pronaroKID-petrosian-central', 'mp-pronaroKID-petrosian-re8'],
  'four pawns attack (f4)': ['mp-pronaroKID-fourpawns-reroute', 'mp-pronaroKID-fourpawns-counter'],
};

export function getProNaroditskyKIDTabPlanIds(
  openingId: string,
  tabKey: string
): string[] | null {
  if (openingId !== 'pro-naroditsky-kid') return null;
  const key = tabKey.toLowerCase();
  return PRO_NARODITSKY_KID_TAB_PLAN_IDS[key] ?? null;
}
