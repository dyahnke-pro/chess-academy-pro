// Tab-plan resolver for pro-naroditsky-kid (per the doctrine STEP 12.5
// fix). Routes each variation tab to its hand-authored middlegame
// plan(s); without this, all plans surface only under the main tab.

export const PRO_NARODITSKY_KID_TAB_PLAN_IDS: Record<string, string[]> = {
  main: [],
  'classical mar del plata (be2)': ['mp-pronaroKID-classical-kingside'],
  'fianchetto variation (g3)': ['mp-pronaroKID-fianchetto-queenside'],
  'anti-kid with nf3 first': ['mp-pronaroKID-antikidnf3-yugoslav'],
  'makogonov (h3)': ['mp-pronaroKID-makogonov-kingside'],
  'sämisch (f3)': ['mp-pronaroKID-saemisch-queenside'],
  'petrosian / nge2': ['mp-pronaroKID-petrosian-central'],
  'four pawns attack (f4)': ['mp-pronaroKID-fourpawns-reroute'],
};

export function getProNaroditskyKIDTabPlanIds(
  openingId: string,
  tabKey: string
): string[] | null {
  if (openingId !== 'pro-naroditsky-kid') return null;
  const key = tabKey.toLowerCase();
  return PRO_NARODITSKY_KID_TAB_PLAN_IDS[key] ?? null;
}
