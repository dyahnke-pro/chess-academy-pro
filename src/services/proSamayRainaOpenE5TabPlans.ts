// Tab-plan resolver for the Samay Raina OpenE5 pro-rep (STEP 12.5). Main tab
// carries the middlegame + endgame plans (EndgamePlansSection filters -endgame);
// variation tabs resolve to [] until a dedicated plan is authored.
export function getProSamayRainaOpenE5TabPlanIds(openingId: string, _tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-open-e5') return null;
  return [];
}
