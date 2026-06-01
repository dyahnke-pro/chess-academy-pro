// Tab-plan resolver for the Samay Raina Ruy pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaRuyTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-ruy') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamayruy-d4break'] : [];
}
