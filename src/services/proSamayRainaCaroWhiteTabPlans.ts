// Tab-plan resolver for the Samay Raina CaroWhite pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaCaroWhiteTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-caro-white') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamaycarow-iqp'] : [];
}
