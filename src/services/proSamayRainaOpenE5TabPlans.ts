// Tab-plan resolver for the Samay Raina OpenE5 pro-rep (STEP 12.5). Main tab
// (Italian Pianissimo) carries the …d5-break plan; the Ruy variation keeps the
// Chigorin plan; other variation tabs resolve to [] until authored.
export function getProSamayRainaOpenE5TabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-open-e5') return null;
  const k = tabKey.toLowerCase();
  if (k === 'main') return ['mp-prosamayopene5-d5break'];
  if (k.includes('ruy')) return ['mp-prosamayopene5-chigorin'];
  return [];
}
