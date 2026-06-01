// Tab-plan resolver for the Samay Raina Italian pro-rep (STEP 12.5). Main tab
// carries the middlegame plan; variation tabs resolve to [] until authored.
export function getProSamayRainaItalianTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-italian') return null;
  return tabKey.toLowerCase() === 'main' ? ['mp-prosamayitalian-reroute'] : [];
}
