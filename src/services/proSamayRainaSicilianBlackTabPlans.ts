// Tab-plan resolver for the Samay Raina SicilianBlack pro-rep (STEP 12.5). Main tab
// carries the middlegame + endgame plans (EndgamePlansSection filters -endgame);
// variation tabs resolve to [] until a dedicated plan is authored.
export function getProSamayRainaSicilianBlackTabPlanIds(openingId: string, _tabKey: string): string[] | null {
  if (openingId !== 'pro-samayraina-sicilian-black') return null;
  return [];
}
