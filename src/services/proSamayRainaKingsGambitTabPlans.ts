// Tab-plan resolver for the Samay Raina King's Gambit pro-rep (STEP 12.5). Main
// tab carries the central-break attacking plan; variation tabs resolve to [].
export function getProSamayRainaKingsGambitTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-kings-gambit') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamaykg-centralbreak'] : [];
}
