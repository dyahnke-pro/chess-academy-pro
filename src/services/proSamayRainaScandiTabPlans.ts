// Tab-plan resolver for the Samay Raina Scandi pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaScandiTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-scandi') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamayscandi-c5break'] : [];
}
