// Tab-plan resolver for the Samay Raina FrenchWhite pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaFrenchWhiteTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-french-white') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamayfrenchw-minority'] : [];
}
