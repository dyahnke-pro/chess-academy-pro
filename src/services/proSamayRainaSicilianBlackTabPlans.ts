// Tab-plan resolver for the Samay Raina SicilianBlack pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaSicilianBlackTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-sicilian-black') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamaysicb-d5break'] : [];
}
