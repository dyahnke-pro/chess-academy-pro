// Tab-plan resolver for the Samay Raina OpenE5 pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaOpenE5TabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-open-e5') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamayopene5-chigorin'] : [];
}
