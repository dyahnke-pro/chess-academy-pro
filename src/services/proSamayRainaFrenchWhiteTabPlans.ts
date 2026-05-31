// Tab-plan resolver for the Samay Raina FrenchWhite pro-rep (STEP 12.5). Main tab
// carries the middlegame + endgame plans (EndgamePlansSection filters -endgame);
// variation tabs resolve to [] until a dedicated plan is authored.
export function getProSamayRainaFrenchWhiteTabPlanIds(openingId: string, _tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-french-white') return null;
  return [];
}
