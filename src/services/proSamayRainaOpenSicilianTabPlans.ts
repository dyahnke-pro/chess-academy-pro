// Tab-plan resolver for the Samay Raina OpenSicilian pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaOpenSicilianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-open-sicilian') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamayopensic-d5outpost'] : [];
}
